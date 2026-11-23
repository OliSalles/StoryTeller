import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { tenantProcedure, router } from "./_core/trpc";
import * as knowledgeDb from "./knowledge-db";
import { processKnowledgeSource } from "./_core/ingestion";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

import { encryptSecret } from "./_core/secret-box";
import { parseGithubRepo } from "./_core/code-chunker";

/** Remove segredos (token criptografado) antes de devolver a fonte ao cliente */
export function sanitizeSourceMetadata<T extends { metadata?: unknown }>(source: T): T {
  const meta = source.metadata as Record<string, unknown> | null | undefined;
  if (!meta || typeof meta !== "object" || !("tokenEnc" in meta)) return source;
  const { tokenEnc, ...rest } = meta;
  return { ...source, metadata: { ...rest, hasToken: Boolean(tokenEnc) } };
}

function assertCanManageCode(ctx: { user: { role: string }; tenant: { isCompanyAdmin: boolean; isCompanyOwner: boolean } }) {
  if (ctx.user.role !== "admin" && !ctx.tenant.isCompanyAdmin && !ctx.tenant.isCompanyOwner) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Só administradores da empresa podem conectar repositórios" });
  }
}

const gitRepoUrlSchema = z
  .string()
  .trim()
  .min(3, "Informe a URL do repositório")
  .max(500)
  .refine(
    (v) => /^https:\/\/[\w.-]+\/[\w./-]+$/i.test(v) || parseGithubRepo(v) !== null,
    "Use uma URL https do repositório, por exemplo https://github.com/empresa/projeto"
  );

// Upload directory for knowledge files
const UPLOAD_DIR = process.env.UPLOAD_DIR || "/tmp/storyteller-uploads";

export const knowledgeRouter = router({
  /**
   * Create a new knowledge source (upload placeholder)
   */
  createSource: tenantProcedure
    .input(
      z.object({
        name: z.string().min(1, "Nome é obrigatório"),
        type: z.enum(['code_repo', 'document', 'story', 'miro_board']),
        teamId: z.number().optional(),
        sourceUrl: z.string().optional(), // For Miro board URL
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sourceId = await knowledgeDb.createKnowledgeSource({
        companyId: ctx.tenant.companyId,
        teamId: input.teamId || null,
        name: input.name,
        type: input.type,
        status: 'pending',
        sourceUrl: input.sourceUrl,
        createdBy: ctx.user.id,
      });
      
      return { sourceId };
    }),

  /**
   * Upload file for a knowledge source
   * NOTE: This is a simplified version. In production, you'd want to use proper file upload middleware
   */
  uploadFile: tenantProcedure
    .input(
      z.object({
        sourceId: z.number(),
        fileName: z.string(),
        fileContent: z.string(), // Base64 encoded file content
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify source exists and belongs to company
      const source = await knowledgeDb.getKnowledgeSourceById(input.sourceId);
      
      if (!source || source.companyId !== ctx.tenant.companyId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fonte de conhecimento não encontrada",
        });
      }
      
      // Create upload directory if it doesn't exist
      await mkdir(UPLOAD_DIR, { recursive: true });
      
      // Generate unique file path
      const fileId = nanoid();
      const ext = path.extname(input.fileName);
      const filePath = path.join(UPLOAD_DIR, `${fileId}${ext}`);
      
      // Decode base64 and save file
      const fileBuffer = Buffer.from(input.fileContent, 'base64');
      await writeFile(filePath, fileBuffer);
      
      // Update source with file path
      await knowledgeDb.updateKnowledgeSource(input.sourceId, {
        sourceUrl: filePath,
        metadata: {
          originalFileName: input.fileName,
          fileSize: fileBuffer.length,
          uploadedAt: new Date().toISOString(),
        },
      });
      
      return { success: true, filePath };
    }),

  /**
   * Start processing a knowledge source
   */
  processSource: tenantProcedure
    .input(z.object({ sourceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      // Verify source exists and belongs to company
      const source = await knowledgeDb.getKnowledgeSourceById(input.sourceId);
      
      if (!source || source.companyId !== ctx.tenant.companyId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fonte de conhecimento não encontrada",
        });
      }
      
      if (source.status !== 'pending') {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Esta fonte já foi processada ou está sendo processada",
        });
      }
      
      // Start processing in background (don't await)
      processKnowledgeSource(input.sourceId).catch((error) => {
        console.error(`[Knowledge] Failed to process source ${input.sourceId}:`, error);
      });
      
      return { success: true, message: "Processamento iniciado" };
    }),

  /**
   * Ingest existing user stories as knowledge
   */
  ingestStories: tenantProcedure
    .input(
      z.object({
        name: z.string().default("User Stories Existentes"),
        teamId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create source for stories
      const sourceId = await knowledgeDb.createKnowledgeSource({
        companyId: ctx.tenant.companyId,
        teamId: input.teamId || null,
        name: input.name,
        type: 'story',
        status: 'pending',
        createdBy: ctx.user.id,
        metadata: {
          ingestedAt: new Date().toISOString(),
        },
      });
      
      // Start processing
      processKnowledgeSource(sourceId).catch((error) => {
        console.error(`[Knowledge] Failed to ingest stories for source ${sourceId}:`, error);
      });
      
      return { sourceId, message: "Ingestão de stories iniciada" };
    }),

  /**
   * List knowledge sources for company
   */
  listSources: tenantProcedure
    .input(
      z.object({
        teamId: z.number().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      let sources;
      if (input?.teamId) {
        sources = await knowledgeDb.getKnowledgeSourcesByTeamId(input.teamId);
      } else {
        sources = await knowledgeDb.getKnowledgeSourcesByCompanyId(ctx.tenant.companyId);
      }
      
      // Only sources of the active company
      sources = sources.filter((source) => source.companyId === ctx.tenant.companyId);

      const chunkCounts = await knowledgeDb.countChunksBySourceForCompany(ctx.tenant.companyId);

      // Enrich with chunk and embedding counts
      const enriched = await Promise.all(
        sources.map(async (source) => {
          const embeddingsCount = await knowledgeDb.countEmbeddingsBySourceId(source.id);
          return {
            ...sanitizeSourceMetadata(source),
            chunksCount: chunkCounts[source.id] ?? 0,
            embeddingsCount,
          };
        })
      );
      
      return enriched;
    }),

  /**
   * Get knowledge source details
   */
  getSource: tenantProcedure
    .input(z.object({ sourceId: z.number() }))
    .query(async ({ ctx, input }) => {
      const source = await knowledgeDb.getKnowledgeSourceById(input.sourceId);
      
      if (!source || source.companyId !== ctx.tenant.companyId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fonte de conhecimento não encontrada",
        });
      }
      
      // Get chunks for this source
      const chunks = await knowledgeDb.getKnowledgeChunksBySourceId(input.sourceId);
      
      return { ...sanitizeSourceMetadata(source), chunksCount: chunks.length };
    }),

  /**
   * Read only: chunks of a source in order, paginated, with optional text search
   */
  getSourceChunks: tenantProcedure
    .input(
      z.object({
        sourceId: z.number(),
        offset: z.number().int().min(0).default(0),
        limit: z.number().int().min(1).max(200).default(50),
        search: z.string().max(200).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const source = await knowledgeDb.getKnowledgeSourceById(input.sourceId);

      if (!source || source.companyId !== ctx.tenant.companyId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fonte de conhecimento não encontrada",
        });
      }

      const { items, total } = await knowledgeDb.getKnowledgeChunksPage({
        sourceId: input.sourceId,
        companyId: ctx.tenant.companyId,
        offset: input.offset,
        limit: input.limit,
        search: input.search,
      });

      return {
        source: {
          id: source.id,
          name: source.name,
          type: source.type,
          status: source.status,
          createdAt: source.createdAt,
          sourceUrl:
            source.type === "miro_board" || (source.metadata as any)?.kind === "git" ? source.sourceUrl : null,
        },
        items,
        total,
        offset: input.offset,
        limit: input.limit,
        hasMore: input.offset + items.length < total,
      };
    }),

  /**
   * Delete knowledge source and all its chunks/embeddings
   */
  deleteSource: tenantProcedure
    .input(z.object({ sourceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const source = await knowledgeDb.getKnowledgeSourceById(input.sourceId);
      
      if (!source || source.companyId !== ctx.tenant.companyId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fonte de conhecimento não encontrada",
        });
      }
      
      // Delete embeddings and chunks (cascade should handle this, but being explicit)
      await knowledgeDb.deleteKnowledgeEmbeddingsBySourceId(input.sourceId);
      await knowledgeDb.deleteKnowledgeChunksBySourceId(input.sourceId);
      
      // Delete source
      await knowledgeDb.deleteKnowledgeSource(input.sourceId);
      
      return { success: true };
    }),

  /**
   * Re-index a knowledge source
   */
  reindexSource: tenantProcedure
    .input(z.object({ sourceId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const source = await knowledgeDb.getKnowledgeSourceById(input.sourceId);
      
      if (!source || source.companyId !== ctx.tenant.companyId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Fonte de conhecimento não encontrada",
        });
      }
      
      // Delete existing chunks and embeddings
      await knowledgeDb.deleteKnowledgeEmbeddingsBySourceId(input.sourceId);
      await knowledgeDb.deleteKnowledgeChunksBySourceId(input.sourceId);
      
      // Reset source status
      await knowledgeDb.updateKnowledgeSource(input.sourceId, {
        status: 'pending',
        processedChunks: 0,
        totalChunks: 0,
        errorMessage: null,
      });
      
      // Start processing again
      processKnowledgeSource(input.sourceId).catch((error) => {
        console.error(`[Knowledge] Failed to reindex source ${input.sourceId}:`, error);
      });
      
      return { success: true, message: "Re-indexação iniciada" };
    }),

  /**
   * Conecta um repositório git (GitHub ou outro com https) como fonte de código.
   * O token é opcional, fica criptografado no servidor e nunca volta para o cliente.
   */
  connectGitRepo: tenantProcedure
    .input(
      z.object({
        repoUrl: gitRepoUrlSchema,
        branch: z.string().trim().max(200).optional(),
        name: z.string().trim().max(200).optional(),
        token: z.string().trim().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertCanManageCode(ctx);
      const gh = parseGithubRepo(input.repoUrl);
      const repoUrl = gh ? `https://github.com/${gh.owner}/${gh.repo}` : input.repoUrl.replace(/\/+$/, "");
      const name = input.name || (gh ? `${gh.owner}/${gh.repo}` : repoUrl.split("/").slice(-2).join("/"));

      const sourceId = await knowledgeDb.createKnowledgeSource({
        companyId: ctx.tenant.companyId,
        teamId: null,
        name,
        type: "code_repo",
        status: "pending",
        sourceUrl: repoUrl,
        createdBy: ctx.user.id,
        metadata: {
          kind: "git",
          repoUrl,
          branch: input.branch || null,
          tokenEnc: input.token ? encryptSecret(input.token) : null,
          connectedAt: new Date().toISOString(),
        },
      });

      processKnowledgeSource(sourceId).catch((error) => {
        console.error(`[Knowledge] Failed to index git repo for source ${sourceId}:`, error instanceof Error ? error.message : error);
      });

      return { sourceId, message: "Indexação do repositório iniciada" };
    }),

  /**
   * Atualiza branch e/ou token de um repositório git conectado e reindexa.
   * token: string nova substitui, string vazia remove, ausente mantém.
   */
  updateGitRepo: tenantProcedure
    .input(
      z.object({
        sourceId: z.number(),
        branch: z.string().trim().max(200).optional(),
        token: z.string().trim().max(500).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertCanManageCode(ctx);
      const source = await knowledgeDb.getKnowledgeSourceById(input.sourceId);
      const meta = (source?.metadata ?? {}) as Record<string, any>;
      if (!source || source.companyId !== ctx.tenant.companyId || meta.kind !== "git") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Repositório não encontrado" });
      }
      const next: Record<string, any> = { ...meta };
      if (input.branch !== undefined) next.branch = input.branch || null;
      if (input.token !== undefined) next.tokenEnc = input.token ? encryptSecret(input.token) : null;

      await knowledgeDb.deleteKnowledgeEmbeddingsBySourceId(input.sourceId);
      await knowledgeDb.deleteKnowledgeChunksBySourceId(input.sourceId);
      await knowledgeDb.updateKnowledgeSource(input.sourceId, {
        metadata: next,
        status: "pending",
        processedChunks: 0,
        totalChunks: 0,
        errorMessage: null,
      });
      processKnowledgeSource(input.sourceId).catch((error) => {
        console.error(`[Knowledge] Failed to reindex git repo ${input.sourceId}:`, error instanceof Error ? error.message : error);
      });
      return { success: true };
    }),

  /**
   * Import Miro board via URL
   */
  importMiroBoard: tenantProcedure
    .input(
      z.object({
        boardUrl: z.string().url("URL inválida"),
        name: z.string().optional(),
        teamId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { extractBoardId } = await import("./_core/miro-ingestion");
      
      // Validate Miro URL
      const boardId = extractBoardId(input.boardUrl);
      if (!boardId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "URL do Miro inválida. Use o formato: https://miro.com/app/board/<id>/",
        });
      }

      // Create source
      const sourceName = input.name || `Miro Board ${boardId}`;
      const sourceId = await knowledgeDb.createKnowledgeSource({
        companyId: ctx.tenant.companyId,
        teamId: input.teamId || null,
        name: sourceName,
        type: 'miro_board',
        status: 'pending',
        sourceUrl: input.boardUrl,
        metadata: { boardId },
        createdBy: ctx.user.id,
      });

      // Start processing
      processKnowledgeSource(sourceId).catch((error) => {
        console.error(`[Knowledge] Failed to process Miro board ${sourceId}:`, error);
      });

      return { sourceId, boardId, message: "Importação do Miro iniciada" };
    }),
});
