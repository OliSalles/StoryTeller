/**
 * Database functions for Knowledge Base and Multi-Tenant features
 */

import { eq, desc, and, sql, or, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  companies,
  InsertCompany,
  companyMembers,
  InsertCompanyMember,
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
    })
    .from(companies)
    .innerJoin(companyMembers, eq(companies.id, companyMembers.companyId))
    .where(eq(companyMembers.userId, userId))
    .orderBy(desc(companies.createdAt));
  
  return result;
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
  
  // First get all chunks for this source
  const chunks = await getKnowledgeChunksBySourceId(sourceId);
  const chunkIds = chunks.map(c => c.id);
  
  if (chunkIds.length > 0) {
    await db.delete(knowledgeEmbeddings).where(inArray(knowledgeEmbeddings.chunkId, chunkIds));
  }
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
