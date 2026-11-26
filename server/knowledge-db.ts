/**
 * Database functions for Knowledge Base and Multi-Tenant features
 */

import { eq, desc, asc, and, sql, or, inArray, ilike, isNull } from "drizzle-orm";
import { randomBytes } from "crypto";
import { getDb } from "./db";
import {
  companies,
  InsertCompany,
  companyMembers,
  InsertCompanyMember,
  companyInvites,
  teams,
  InsertTeam,
  teamMembers,
  InsertTeamMember,
  knowledgeSources,
  InsertKnowledgeSource,
  knowledgeChunks,
  InsertKnowledgeChunk,
  knowledgeEmbeddings,
  InsertKnowledgeEmbedding,
  storySimilarities,
  InsertStorySimilarity,
  knowledgeChatSessions,
  InsertKnowledgeChatSession,
  knowledgeChatMessages,
  InsertKnowledgeChatMessage,
} from "../drizzle/schema";

// ============================================
// Company queries
// ============================================

export async function createCompany(company: InsertCompany) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(companies).values(company).returning({ id: companies.id });
  return result[0]?.id ?? 0;
}

export async function getCompanyById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCompanyBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCompaniesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all companies where user is a member
  const result = await db
    .select({
      id: companies.id,
      name: companies.name,
      slug: companies.slug,
      ownerId: companies.ownerId,
      createdAt: companies.createdAt,
      updatedAt: companies.updatedAt,
      role: companyMembers.role,
      memberSince: companyMembers.createdAt,
    })
    .from(companies)
    .innerJoin(companyMembers, eq(companies.id, companyMembers.companyId))
    .where(eq(companyMembers.userId, userId))
    .orderBy(desc(companyMembers.createdAt), desc(companies.id));

  return result;
}

/** Quantos membros podem administrar a empresa (admin ou proprietário) */
export async function countCompanyAdmins(companyId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.execute(sql`
    SELECT count(*)::int AS n FROM company_members cm
    JOIN companies c ON c.id = cm.company_id
    WHERE cm.company_id = ${companyId} AND (cm.role IN ('admin', 'owner') OR cm.user_id = c.owner_id)
  `);
  return Number((result.rows as any[])[0]?.n ?? 0);
}

/** Números da empresa para a página de detalhe */
export async function getCompanyStats(companyId: number) {
  const db = await getDb();
  if (!db) return { members: 0, admins: 0, sources: 0, chunks: 0, teams: 0 };
  const result = await db.execute(sql`
    SELECT
      (SELECT count(*)::int FROM company_members WHERE company_id = ${companyId}) AS members,
      (SELECT count(*)::int FROM knowledge_sources WHERE company_id = ${companyId}) AS sources,
      (SELECT count(*)::int FROM knowledge_chunks WHERE company_id = ${companyId}) AS chunks,
      (SELECT count(*)::int FROM teams WHERE company_id = ${companyId}) AS teams
  `);
  const row = (result.rows as any[])[0] ?? {};
  return {
    members: Number(row.members ?? 0),
    admins: await countCompanyAdmins(companyId),
    sources: Number(row.sources ?? 0),
    chunks: Number(row.chunks ?? 0),
    teams: Number(row.teams ?? 0),
  };
}

/** Passa a propriedade para outro membro; o antigo proprietário vira admin */
export async function transferCompanyOwnership(companyId: number, fromUserId: number, toUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.transaction(async (tx) => {
    await tx.update(companies).set({ ownerId: toUserId, updatedAt: new Date() }).where(eq(companies.id, companyId));
    await tx
      .update(companyMembers)
      .set({ role: "owner" })
      .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, toUserId)));
    await tx
      .update(companyMembers)
      .set({ role: "admin" })
      .where(and(eq(companyMembers.companyId, companyId), eq(companyMembers.userId, fromUserId)));
  });
}

export async function updateCompany(id: number, data: Partial<InsertCompany>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(companies).set({ ...data, updatedAt: new Date() }).where(eq(companies.id, id));
  return getCompanyById(id);
}

export async function deleteCompany(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(companies).where(eq(companies.id, id));
}

// ============================================
// Company Member queries
// ============================================

// ============================================
// Company invites (pessoas sem conta ainda)
// ============================================

/** Cria o convite pendente ou atualiza o nível de um que já existe; o token continua o mesmo */
export async function upsertCompanyInvite(data: {
  companyId: number;
  email: string;
  role: "member" | "admin";
  invitedBy: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const email = data.email.trim().toLowerCase();

  const existing = await db
    .select()
    .from(companyInvites)
    .where(and(eq(companyInvites.companyId, data.companyId), eq(companyInvites.email, email), isNull(companyInvites.acceptedAt)))
    .limit(1);
  if (existing[0]) {
    const [updated] = await db
      .update(companyInvites)
      .set({ role: data.role, invitedBy: data.invitedBy, lastSentAt: new Date() })
      .where(eq(companyInvites.id, existing[0].id))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(companyInvites)
    .values({ ...data, email, token: randomBytes(24).toString("hex") })
    .returning();
  return created;
}

export async function listPendingCompanyInvites(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select({
      id: companyInvites.id,
      email: companyInvites.email,
      role: companyInvites.role,
      createdAt: companyInvites.createdAt,
      lastSentAt: companyInvites.lastSentAt,
      invitedByName: sql<string | null>`(select name from users where users.id = ${companyInvites.invitedBy})`,
    })
    .from(companyInvites)
    .where(and(eq(companyInvites.companyId, companyId), isNull(companyInvites.acceptedAt)))
    .orderBy(desc(companyInvites.createdAt));
}

export async function getPendingCompanyInvite(companyId: number, inviteId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select()
    .from(companyInvites)
    .where(and(eq(companyInvites.id, inviteId), eq(companyInvites.companyId, companyId), isNull(companyInvites.acceptedAt)))
    .limit(1);
  return result[0] ?? null;
}

export async function touchCompanyInvite(inviteId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(companyInvites).set({ lastSentAt: new Date() }).where(eq(companyInvites.id, inviteId));
}

export async function deleteCompanyInvite(companyId: number, inviteId: number) {
  const db = await getDb();
  if (!db) return;
  await db
    .delete(companyInvites)
    .where(and(eq(companyInvites.id, inviteId), eq(companyInvites.companyId, companyId), isNull(companyInvites.acceptedAt)));
}

/** Dados públicos do convite para a tela de cadastro */
export async function getPendingInviteByToken(token: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db
    .select({
      email: companyInvites.email,
      companyName: companies.name,
      invitedByName: sql<string | null>`(select name from users where users.id = ${companyInvites.invitedBy})`,
    })
    .from(companyInvites)
    .innerJoin(companies, eq(companies.id, companyInvites.companyId))
    .where(and(eq(companyInvites.token, token), isNull(companyInvites.acceptedAt)))
    .limit(1);
  return result[0] ?? null;
}

/**
 * Converte os convites pendentes do email em memberships. Chamado no cadastro e no login.
 * Retorna as empresas em que a pessoa entrou.
 */
export async function acceptPendingInvitesForUser(userId: number, email: string): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const pending = await db
    .select()
    .from(companyInvites)
    .where(and(eq(companyInvites.email, email.trim().toLowerCase()), isNull(companyInvites.acceptedAt)));

  const joined: number[] = [];
  for (const invite of pending) {
    await db.transaction(async (tx) => {
      const already = await tx
        .select({ id: companyMembers.id })
        .from(companyMembers)
        .where(and(eq(companyMembers.companyId, invite.companyId), eq(companyMembers.userId, userId)))
        .limit(1);
      if (!already[0]) {
        await tx.insert(companyMembers).values({ companyId: invite.companyId, userId, role: invite.role });
        joined.push(invite.companyId);
      }
      await tx.update(companyInvites).set({ acceptedAt: new Date() }).where(eq(companyInvites.id, invite.id));
    });
  }
  return joined;
}

export async function addCompanyMember(member: InsertCompanyMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(companyMembers).values(member).returning({ id: companyMembers.id });
  return result[0]?.id ?? 0;
}

export async function getCompanyMembers(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: companyMembers.id,
      userId: companyMembers.userId,
      companyId: companyMembers.companyId,
      role: companyMembers.role,
      createdAt: companyMembers.createdAt,
      userName: sql<string>`users.name`,
      userEmail: sql<string>`users.email`,
    })
    .from(companyMembers)
    .leftJoin(sql`users`, sql`users.id = ${companyMembers.userId}`)
    .where(eq(companyMembers.companyId, companyId));
  
  return result;
}

/** Ids de todos os usuários ligados à empresa: dono + membros (para o plano efetivo da empresa) */
export async function getCompanyUserIds(companyId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  const [company, members] = await Promise.all([
    db.select({ ownerId: companies.ownerId }).from(companies).where(eq(companies.id, companyId)).limit(1),
    db.select({ userId: companyMembers.userId }).from(companyMembers).where(eq(companyMembers.companyId, companyId)),
  ]);

  const ids = new Set<number>(members.map((m) => m.userId));
  if (company[0]?.ownerId) ids.add(company[0].ownerId);
  return Array.from(ids);
}

export async function getCompanyMember(companyId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db
    .select()
    .from(companyMembers)
    .where(and(
      eq(companyMembers.companyId, companyId),
      eq(companyMembers.userId, userId)
    ))
    .limit(1);
  
  return result.length > 0 ? result[0] : undefined;
}

export async function updateCompanyMemberRole(companyId: number, userId: number, role: 'owner' | 'admin' | 'member') {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(companyMembers)
    .set({ role })
    .where(and(
      eq(companyMembers.companyId, companyId),
      eq(companyMembers.userId, userId)
    ));
}

export async function removeCompanyMember(companyId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(companyMembers).where(and(
    eq(companyMembers.companyId, companyId),
    eq(companyMembers.userId, userId)
  ));
}

// ============================================
// Team queries
// ============================================

export async function createTeam(team: InsertTeam) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(teams).values(team).returning({ id: teams.id });
  return result[0]?.id ?? 0;
}

export async function getTeamById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(teams).where(eq(teams.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTeamsByCompanyId(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(teams).where(eq(teams.companyId, companyId)).orderBy(teams.name);
}

export async function updateTeam(id: number, data: Partial<InsertTeam>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(teams).set({ ...data, updatedAt: new Date() }).where(eq(teams.id, id));
  return getTeamById(id);
}

export async function deleteTeam(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(teams).where(eq(teams.id, id));
}

// ============================================
// Team Member queries
// ============================================

export async function addTeamMember(member: InsertTeamMember) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(teamMembers).values(member).returning({ id: teamMembers.id });
  return result[0]?.id ?? 0;
}

export async function getTeamMembers(teamId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: teamMembers.id,
      teamId: teamMembers.teamId,
      userId: teamMembers.userId,
      createdAt: teamMembers.createdAt,
      userName: sql<string>`users.name`,
      userEmail: sql<string>`users.email`,
    })
    .from(teamMembers)
    .leftJoin(sql`users`, sql`users.id = ${teamMembers.userId}`)
    .where(eq(teamMembers.teamId, teamId));
  
  return result;
}

export async function getUserTeams(userId: number, companyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      id: teams.id,
      companyId: teams.companyId,
      name: teams.name,
      description: teams.description,
      createdAt: teams.createdAt,
      updatedAt: teams.updatedAt,
    })
    .from(teams)
    .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .where(and(
      eq(teamMembers.userId, userId),
      eq(teams.companyId, companyId)
    ))
    .orderBy(teams.name);
  
  return result;
}

export async function removeTeamMember(teamId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(teamMembers).where(and(
    eq(teamMembers.teamId, teamId),
    eq(teamMembers.userId, userId)
  ));
}

// ============================================
// Knowledge Source queries
// ============================================

export async function createKnowledgeSource(source: InsertKnowledgeSource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(knowledgeSources).values(source).returning({ id: knowledgeSources.id });
  return result[0]?.id ?? 0;
}

export async function getKnowledgeSourceById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(knowledgeSources).where(eq(knowledgeSources.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getKnowledgeSourcesByCompanyId(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(knowledgeSources)
    .where(eq(knowledgeSources.companyId, companyId))
    .orderBy(desc(knowledgeSources.createdAt));
}

export async function getKnowledgeSourcesByTeamId(teamId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(knowledgeSources)
    .where(eq(knowledgeSources.teamId, teamId))
    .orderBy(desc(knowledgeSources.createdAt));
}

export async function updateKnowledgeSource(id: number, data: Partial<InsertKnowledgeSource>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(knowledgeSources).set({ ...data, updatedAt: new Date() }).where(eq(knowledgeSources.id, id));
  return getKnowledgeSourceById(id);
}

export async function deleteKnowledgeSource(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(knowledgeSources).where(eq(knowledgeSources.id, id));
}

// ============================================
// Knowledge Chunk queries
// ============================================

export async function createKnowledgeChunk(chunk: InsertKnowledgeChunk) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(knowledgeChunks).values(chunk).returning({ id: knowledgeChunks.id });
  return result[0]?.id ?? 0;
}

export async function getKnowledgeChunkById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(knowledgeChunks).where(eq(knowledgeChunks.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getKnowledgeChunksBySourceId(sourceId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(knowledgeChunks)
    .where(eq(knowledgeChunks.sourceId, sourceId))
    .orderBy(knowledgeChunks.chunkIndex);
}

/**
 * Count chunks per source for a company (read only, single query)
 */
export async function countChunksBySourceForCompany(companyId: number): Promise<Record<number, number>> {
  const db = await getDb();
  if (!db) return {};

  const rows = await db
    .select({ sourceId: knowledgeChunks.sourceId, count: sql<number>`count(*)` })
    .from(knowledgeChunks)
    .where(eq(knowledgeChunks.companyId, companyId))
    .groupBy(knowledgeChunks.sourceId);

  const map: Record<number, number> = {};
  for (const row of rows) map[row.sourceId] = Number(row.count ?? 0);
  return map;
}

/**
 * Paginated chunks of a source, scoped by company, with optional text search
 */
export async function getKnowledgeChunksPage(params: {
  sourceId: number;
  companyId: number;
  offset: number;
  limit: number;
  search?: string;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const conditions = [
    or(
      eq(knowledgeChunks.sourceId, params.sourceId),
      sql`${knowledgeChunks.metadata}->'alsoIn' @> ${JSON.stringify([{ sourceId: params.sourceId }])}::jsonb`
    )!,
    eq(knowledgeChunks.companyId, params.companyId),
  ];
  const term = params.search?.trim();
  if (term) {
    const escaped = term.replace(/[\\%_]/g, (c) => `\\${c}`);
    conditions.push(ilike(knowledgeChunks.content, `%${escaped}%`));
  }
  const where = and(...conditions);

  const [items, totalRows] = await Promise.all([
    db
      .select({
        id: knowledgeChunks.id,
        chunkIndex: knowledgeChunks.chunkIndex,
        content: knowledgeChunks.content,
        metadata: knowledgeChunks.metadata,
        tokenCount: knowledgeChunks.tokenCount,
        createdAt: knowledgeChunks.createdAt,
      })
      .from(knowledgeChunks)
      .where(where)
      .orderBy(asc(knowledgeChunks.id))
      .limit(params.limit)
      .offset(params.offset),
    db.select({ count: sql<number>`count(*)` }).from(knowledgeChunks).where(where),
  ]);

  return { items, total: Number(totalRows[0]?.count ?? 0) };
}

export async function deleteKnowledgeChunksBySourceId(sourceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(knowledgeChunks).where(eq(knowledgeChunks.sourceId, sourceId));
}

// ============================================
// Knowledge Embedding queries
// ============================================

export async function createKnowledgeEmbedding(embedding: InsertKnowledgeEmbedding) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(knowledgeEmbeddings).values(embedding).returning({ id: knowledgeEmbeddings.id });
  return result[0]?.id ?? 0;
}

export async function getKnowledgeEmbeddingByChunkId(chunkId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(knowledgeEmbeddings).where(eq(knowledgeEmbeddings.chunkId, chunkId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

/**
 * Count embeddings for a given source
 */
export async function countEmbeddingsBySourceId(sourceId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(knowledgeEmbeddings)
    .innerJoin(knowledgeChunks, eq(knowledgeEmbeddings.chunkId, knowledgeChunks.id))
    .where(eq(knowledgeChunks.sourceId, sourceId));
  
  return Number(result[0]?.count ?? 0);
}

/**
 * Search for similar embeddings using cosine similarity
 * Uses the search_similar_embeddings function created in the migration
 */
export async function searchSimilarEmbeddings(
  queryEmbedding: number[],
  companyId: number,
  matchCount: number = 10,
  similarityThreshold: number = 0.7
) {
  const db = await getDb();
  if (!db) return [];
  
  // Convert array to pgvector format string
  const embeddingStr = `[${queryEmbedding.join(',')}]`;
  
  // Use the SQL function created in migration
  const result = await db.execute(sql`
    SELECT * FROM search_similar_embeddings(
      ${embeddingStr}::vector,
      ${companyId},
      ${matchCount},
      ${similarityThreshold}
    )
  `);
  
  return result.rows as Array<{
    chunk_id: number;
    content: string;
    similarity: number;
    source_id: number;
    source_name: string;
    metadata: any;
  }>;
}

export async function deleteKnowledgeEmbeddingsBySourceId(sourceId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Trechos mesclados de outras fontes não podem sumir junto com esta
  const toRebuild = await detachSourceFromMerges(sourceId);
  if (toRebuild.length > 0) {
    const { rebuildMergedChunks } = await import("./_core/ingestion");
    await rebuildMergedChunks(toRebuild).catch((err) =>
      console.error(`[Knowledge] Falha ao refazer trechos mesclados ${toRebuild.join(",")}:`, err)
    );
  }

  // First get all chunks for this source
  const chunks = await getKnowledgeChunksBySourceId(sourceId);
  const chunkIds = chunks.map(c => c.id);
  
  if (chunkIds.length > 0) {
    await db.delete(knowledgeEmbeddings).where(inArray(knowledgeEmbeddings.chunkId, chunkIds));
  }
}

// ============================================
// Deduplicação de trechos
// ============================================

/** Outra fonte que também tinha este conteúdo; o trecho é guardado uma vez só */
export type MergedSourceRef = { sourceId: number; sourceName?: string; similarity: number; mergedAt: string };

/**
 * Trecho já existente na empresa mais parecido com o embedding, se passar do limiar.
 * Código fica de fora: o mesmo trecho em arquivos diferentes tem contexto diferente.
 */
export async function findNearDuplicateChunk(
  companyId: number,
  embedding: number[],
  threshold: number
): Promise<{ chunkId: number; sourceId: number; similarity: number; content: string; metadata: Record<string, any> | null } | null> {
  const db = await getDb();
  if (!db) return null;
  const embeddingStr = `[${embedding.join(",")}]`;
  const result = await db.execute(sql`
    SELECT kc.id AS chunk_id, kc.source_id, kc.content, kc.metadata,
           1 - (ke.embedding <=> ${embeddingStr}::vector) AS similarity
    FROM knowledge_embeddings ke
    JOIN knowledge_chunks kc ON ke.chunk_id = kc.id
    WHERE ke.company_id = ${companyId} AND COALESCE(kc.metadata->>'fileType', '') <> 'code'
    ORDER BY ke.embedding <=> ${embeddingStr}::vector
    LIMIT 1
  `);
  const row = (result.rows as any[])[0];
  if (!row) return null;
  const similarity = Number(row.similarity) || 0;
  if (similarity < threshold) return null;
  return {
    chunkId: Number(row.chunk_id),
    sourceId: Number(row.source_id),
    similarity,
    content: String(row.content ?? ""),
    metadata: (row.metadata as Record<string, any>) ?? null,
  };
}

/** Texto original que cada fonte trouxe para um trecho mesclado com IA */
export type ChunkContribution = { sourceId: number; content: string };

/** Troca o texto e o embedding de um trecho (mesclagem com IA ou refação dela) */
export async function updateChunkContent(
  chunkId: number,
  content: string,
  metadata: Record<string, any>,
  embedding: number[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(knowledgeChunks)
    .set({ content, metadata, tokenCount: Math.ceil(content.length / 4) })
    .where(eq(knowledgeChunks.id, chunkId));
  await db.execute(sql`
    UPDATE knowledge_embeddings SET embedding = ${`[${embedding.join(",")}]`}::vector WHERE chunk_id = ${chunkId}
  `);
}

/** Registra no trecho existente que outra fonte também tem esse conteúdo */
export async function addMergedSourceToChunk(chunkId: number, ref: MergedSourceRef) {
  const db = await getDb();
  if (!db) return;
  await db.execute(sql`
    UPDATE knowledge_chunks
    SET metadata = jsonb_set(
      COALESCE(metadata, '{}'::jsonb),
      '{alsoIn}',
      COALESCE(metadata->'alsoIn', '[]'::jsonb) || ${JSON.stringify([ref])}::jsonb
    )
    WHERE id = ${chunkId}
      AND source_id <> ${ref.sourceId}
      AND NOT (COALESCE(metadata->'alsoIn', '[]'::jsonb) @> ${JSON.stringify([{ sourceId: ref.sourceId }])}::jsonb)
  `);
}

/**
 * Antes de apagar os trechos de uma fonte (exclusão ou reindexação):
 * tira a fonte das mesclagens de outros trechos e passa para a próxima fonte
 * os trechos dela que também pertencem a outras.
 */
export async function detachSourceFromMerges(sourceId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];
  const ref = JSON.stringify([{ sourceId }]);
  await db.execute(sql`
    UPDATE knowledge_chunks
    SET metadata = jsonb_set(
      metadata,
      '{alsoIn}',
      COALESCE(
        (SELECT jsonb_agg(x) FROM jsonb_array_elements(metadata->'alsoIn') x WHERE (x->>'sourceId')::int <> ${sourceId}),
        '[]'::jsonb
      )
    )
    WHERE metadata->'alsoIn' @> ${ref}::jsonb
  `);
  await db.execute(sql`
    UPDATE knowledge_chunks
    SET source_id = (metadata->'alsoIn'->0->>'sourceId')::int,
        metadata = jsonb_set(metadata, '{alsoIn}', (metadata->'alsoIn') - 0)
    WHERE source_id = ${sourceId}
      AND jsonb_typeof(metadata->'alsoIn') = 'array'
      AND jsonb_array_length(metadata->'alsoIn') > 0
  `);
  // A contribuição da fonte sai do trecho; quem tinha texto mesclado com IA precisa ser refeito
  const rebuild = await db.execute(sql`
    UPDATE knowledge_chunks
    SET metadata = jsonb_set(
      metadata,
      '{contributions}',
      COALESCE(
        (SELECT jsonb_agg(x) FROM jsonb_array_elements(metadata->'contributions') x WHERE (x->>'sourceId')::int <> ${sourceId}),
        '[]'::jsonb
      )
    )
    WHERE metadata->'contributions' @> ${ref}::jsonb
      AND source_id <> ${sourceId}
    RETURNING id
  `);
  return (rebuild.rows as any[]).map((r) => Number(r.id));
}

export async function getChunksByIds(ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return [];
  return db.select().from(knowledgeChunks).where(inArray(knowledgeChunks.id, ids));
}

/** Quantos trechos desta fonte foram mesclados em trechos que já existiam */
export async function countChunksMergedIntoSource(sourceId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.execute(sql`
    SELECT count(*)::int AS n FROM knowledge_chunks
    WHERE metadata->'alsoIn' @> ${JSON.stringify([{ sourceId }])}::jsonb
  `);
  return Number((result.rows as any[])[0]?.n ?? 0);
}

// ============================================
// Story Similarity queries
// ============================================

export async function createStorySimilarity(similarity: InsertStorySimilarity) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(storySimilarities).values(similarity).returning({ id: storySimilarities.id });
  return result[0]?.id ?? 0;
}

export async function getStorySimilaritiesByStoryId(storyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(storySimilarities)
    .where(eq(storySimilarities.storyId, storyId))
    .orderBy(desc(storySimilarities.similarityScore));
}

export async function getStorySimilaritiesByCompanyId(companyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(storySimilarities)
    .where(eq(storySimilarities.companyId, companyId))
    .orderBy(desc(storySimilarities.createdAt));
}

// ============================================
// Knowledge Chat Session queries
// ============================================

export async function createKnowledgeChatSession(session: InsertKnowledgeChatSession) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(knowledgeChatSessions).values(session).returning({ id: knowledgeChatSessions.id });
  return result[0]?.id ?? 0;
}

export async function getKnowledgeChatSessionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(knowledgeChatSessions).where(eq(knowledgeChatSessions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getKnowledgeChatSessionsByUserId(userId: number, companyId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(knowledgeChatSessions)
    .where(and(
      eq(knowledgeChatSessions.userId, userId),
      eq(knowledgeChatSessions.companyId, companyId)
    ))
    .orderBy(desc(knowledgeChatSessions.updatedAt));
}

export async function updateKnowledgeChatSession(id: number, data: Partial<InsertKnowledgeChatSession>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(knowledgeChatSessions).set({ ...data, updatedAt: new Date() }).where(eq(knowledgeChatSessions.id, id));
  return getKnowledgeChatSessionById(id);
}

/** Define só o título, sem alterar a ordem do histórico */
export async function setKnowledgeChatSessionTitle(id: number, title: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(knowledgeChatSessions).set({ title }).where(eq(knowledgeChatSessions.id, id));
}

export async function deleteKnowledgeChatSession(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.delete(knowledgeChatSessions).where(eq(knowledgeChatSessions.id, id));
}

// ============================================
// Knowledge Chat Message queries
// ============================================

export async function createKnowledgeChatMessage(message: InsertKnowledgeChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(knowledgeChatMessages).values(message).returning({ id: knowledgeChatMessages.id });
  return result[0]?.id ?? 0;
}

export async function getKnowledgeChatMessagesBySessionId(sessionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(knowledgeChatMessages)
    .where(eq(knowledgeChatMessages.sessionId, sessionId))
    .orderBy(knowledgeChatMessages.createdAt);
}

// ============================================
// Hybrid retrieval (vector + keyword), sem migrations
// ============================================

const ACCENTED = "áàâãäéèêëíìîïóòôõöúùûüçñ";
const UNACCENTED = "aaaaaeeeeiiiiooooouuuucn";

/** Categoria de fonte para débitos técnicos e propostas de melhoria (knowledge_sources.metadata.category) */
export const TECH_DEBT_CATEGORY = "tech_debt";

export type CategoryFilter = "only_tech_debt" | "exclude_tech_debt";

function categoryFilterSql(filter?: CategoryFilter) {
  if (filter === "only_tech_debt") return sql`AND ks.metadata->>'category' = ${TECH_DEBT_CATEGORY}`;
  if (filter === "exclude_tech_debt") return sql`AND COALESCE(ks.metadata->>'category', '') <> ${TECH_DEBT_CATEGORY}`;
  return sql``;
}

export type HybridChunkRow = {
  chunk_id: number;
  content: string;
  similarity: number;
  source_id: number;
  source_name: string;
  source_type: string | null;
  metadata: any;
};

/**
 * Busca vetorial direta (mesma lógica do search_similar_embeddings, mas devolvendo também o tipo da fonte)
 */
export async function searchVectorChunks(
  queryEmbedding: number[],
  companyId: number,
  matchCount = 20,
  sourceTypes?: string[],
  category?: CategoryFilter
): Promise<HybridChunkRow[]> {
  const db = await getDb();
  if (!db) return [];
  const embeddingStr = `[${queryEmbedding.join(",")}]`;
  const typeFilter =
    sourceTypes && sourceTypes.length > 0
      ? sql`AND ks.type::text IN (${sql.join(sourceTypes.map((t) => sql`${t}`), sql`, `)})`
      : sql``;
  const result = await db.execute(sql`
    SELECT kc.id AS chunk_id, kc.content,
           1 - (ke.embedding <=> ${embeddingStr}::vector) AS similarity,
           ks.id AS source_id, ks.name AS source_name, ks.type::text AS source_type, kc.metadata
    FROM knowledge_embeddings ke
    JOIN knowledge_chunks kc ON ke.chunk_id = kc.id
    JOIN knowledge_sources ks ON kc.source_id = ks.id
    WHERE ke.company_id = ${companyId} ${typeFilter} ${categoryFilterSql(category)}
    ORDER BY ke.embedding <=> ${embeddingStr}::vector
    LIMIT ${matchCount}
  `);
  return (result.rows as any[]).map((r) => ({ ...r, similarity: Number(r.similarity) || 0 }));
}

/**
 * Busca por palavra chave no texto dos trechos, sem acento e sem diferenciar maiúsculas.
 * Termos já devem vir normalizados (minúsculos, sem acento).
 */
export async function searchKeywordChunks(
  terms: string[],
  companyId: number,
  matchCount = 30,
  sourceTypes?: string[],
  category?: CategoryFilter
): Promise<HybridChunkRow[]> {
  const db = await getDb();
  if (!db || terms.length === 0) return [];

  const escapeLike = (t: string) => t.replace(/[\\%_]/g, (m) => `\\${m}`);
  const scoreParts = terms.map((t) => {
    const weight = t.split(" ").length * 3 + Math.min(t.length, 20) / 10;
    return sql`(CASE WHEN norm LIKE ${"%" + escapeLike(t) + "%"} THEN ${weight}::float ELSE 0 END)`;
  });
  const anyMatch = terms.map((t) => sql`norm LIKE ${"%" + escapeLike(t) + "%"}`);
  const typeFilter =
    sourceTypes && sourceTypes.length > 0
      ? sql`AND ks.type::text IN (${sql.join(sourceTypes.map((t) => sql`${t}`), sql`, `)})`
      : sql``;

  const result = await db.execute(sql`
    SELECT chunk_id, content, source_id, source_name, source_type, metadata,
           (${sql.join(scoreParts, sql` + `)}) AS kw_score
    FROM (
      SELECT kc.id AS chunk_id, kc.content, ks.id AS source_id, ks.name AS source_name,
             ks.type::text AS source_type, kc.metadata,
             translate(lower(kc.content || ' ' || ks.name), ${ACCENTED}, ${UNACCENTED}) AS norm
      FROM knowledge_chunks kc
      JOIN knowledge_sources ks ON kc.source_id = ks.id
      WHERE kc.company_id = ${companyId} ${typeFilter} ${categoryFilterSql(category)}
    ) t
    WHERE ${sql.join(anyMatch, sql` OR `)}
    ORDER BY kw_score DESC, length(content) DESC
    LIMIT ${matchCount}
  `);
  return (result.rows as any[]).map((r) => ({
    chunk_id: r.chunk_id,
    content: r.content,
    similarity: 0,
    source_id: r.source_id,
    source_name: r.source_name,
    source_type: r.source_type,
    metadata: r.metadata,
  }));
}
