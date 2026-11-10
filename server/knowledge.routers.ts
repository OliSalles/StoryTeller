import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { tenantProcedure, router } from "./_core/trpc";
import * as knowledgeDb from "./knowledge-db";
import { processKnowledgeSource } from "./_core/ingestion";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { nanoid } from "nanoid";

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
        type: z.enum(['code_repo', 'document', 'story']),
        teamId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const sourceId = await knowledgeDb.createKnowledgeSource({
        companyId: ctx.tenant.companyId,
        teamId: input.teamId || null,
        name: input.name,
        type: input.type,
        status: 'pending',
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
      if (input?.teamId) {
        return knowledgeDb.getKnowledgeSourcesByTeamId(input.teamId);
      }
      
      return knowledgeDb.getKnowledgeSourcesByCompanyId(ctx.tenant.companyId);
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
      
      return { ...source, chunksCount: chunks.length };
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
});
