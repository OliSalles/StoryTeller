import { 
  integer, 
  pgTable, 
  text, 
  timestamp, 
  varchar, 
  serial, 
  pgEnum,
  jsonb,
  boolean,
  vector
} from "drizzle-orm/pg-core";
import { users } from "./schema";

// ============================================
// Multi-Tenant: Companies & Teams
// ============================================

/**
 * Companies table - organizations/workspaces for multi-tenant support
 * Each company is isolated and owns its own data
 */
export const companies = pgTable("companies", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  ownerId: integer("owner_id").notNull().references(() => users.id),
  
  // Similarity analysis thresholds (configurable per company)
  similarityThresholdDuplicate: integer("similarity_threshold_duplicate").default(85), // >85% = duplicate
  similarityThresholdReusable: integer("similarity_threshold_reusable").default(60), // 60-85% = reusable
  similarityThresholdMinimum: integer("similarity_threshold_minimum").default(40), // <40% = not related (hidden)
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Company = typeof companies.$inferSelect;
export type InsertCompany = typeof companies.$inferInsert;

/**
 * Company members - users can belong to multiple companies with different roles
 */
export const companyRoleEnum = pgEnum("company_role", ["owner", "admin", "member"]);

export const companyMembers = pgTable("company_members", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  role: companyRoleEnum("role").notNull().default("member"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type CompanyMember = typeof companyMembers.$inferSelect;
export type InsertCompanyMember = typeof companyMembers.$inferInsert;

/**
 * Teams - organize members within a company
 */
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Team = typeof teams.$inferSelect;
export type InsertTeam = typeof teams.$inferInsert;

/**
 * Team members - users can belong to multiple teams within a company
 */
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = typeof teamMembers.$inferInsert;

// ============================================
// RAG Knowledge Base
// ============================================

/**
 * Knowledge sources - tracks uploaded/connected knowledge sources
 */
export const knowledgeSourceTypeEnum = pgEnum("knowledge_source_type", [
  "code_repo",    // GitHub repo or zip upload
  "document",     // PDF, DOCX, MD, TXT files
  "story",        // User stories created or imported
  "miro_board",   // Miro board via API or export
]);

export const knowledgeSourceStatusEnum = pgEnum("knowledge_source_status", [
  "pending",      // Waiting to be processed
  "processing",   // Currently being ingested
  "completed",    // Successfully ingested
  "failed",       // Processing failed
]);

export const knowledgeSources = pgTable("knowledge_sources", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  teamId: integer("team_id").references(() => teams.id, { onDelete: "set null" }), // Optional team association
  name: varchar("name", { length: 512 }).notNull(),
  type: knowledgeSourceTypeEnum("type").notNull(),
  status: knowledgeSourceStatusEnum("status").notNull().default("pending"),
  
  // Source-specific metadata
  sourceUrl: text("source_url"), // GitHub URL or file path
  metadata: jsonb("metadata"), // Store type-specific data (repo info, file info, etc)
  
  // Processing info
  totalChunks: integer("total_chunks").default(0),
  processedChunks: integer("processed_chunks").default(0),
  errorMessage: text("error_message"),
  
  createdBy: integer("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type KnowledgeSource = typeof knowledgeSources.$inferSelect;
export type InsertKnowledgeSource = typeof knowledgeSources.$inferInsert;

/**
 * Knowledge chunks - text chunks from processed sources
 */
export const knowledgeChunks = pgTable("knowledge_chunks", {
  id: serial("id").primaryKey(),
  sourceId: integer("source_id").notNull().references(() => knowledgeSources.id, { onDelete: "cascade" }),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  
  // Content
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // Store chunk-specific data (file path, line numbers, etc)
  
  // Chunking info
  chunkIndex: integer("chunk_index").notNull(),
  tokenCount: integer("token_count"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type InsertKnowledgeChunk = typeof knowledgeChunks.$inferInsert;

/**
 * Knowledge embeddings - vector embeddings for semantic search
 * Uses pgvector extension for similarity search
 */
export const knowledgeEmbeddings = pgTable("knowledge_embeddings", {
  id: serial("id").primaryKey(),
  chunkId: integer("chunk_id").notNull().references(() => knowledgeChunks.id, { onDelete: "cascade" }),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  
  // Vector embedding (OpenAI ada-002 = 1536 dimensions, text-embedding-3-small = 1536)
  embedding: vector("embedding", { dimensions: 1536 }),
  
  // Model info
  model: varchar("model", { length: 128 }).notNull().default("text-embedding-3-small"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type KnowledgeEmbedding = typeof knowledgeEmbeddings.$inferSelect;
export type InsertKnowledgeEmbedding = typeof knowledgeEmbeddings.$inferInsert;

/**
 * Story similarity analysis - tracks when stories were analyzed and their results
 */
export const storySimilarityTypeEnum = pgEnum("story_similarity_type", [
  "duplicate",    // Exact or near-duplicate story
  "reusable",     // Similar story/feature/code that can be leveraged
  "convergent",   // Overlaps/converges with another story
]);

export const storySimilarities = pgTable("story_similarities", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  
  // Story being analyzed
  storyId: integer("story_id").notNull(), // Reference to userStories.id (can't use FK if story is new/unsaved)
  storyTitle: text("story_title").notNull(),
  storyDescription: text("story_description").notNull(),
  
  // Related item (could be another story, code file, or document)
  relatedType: varchar("related_type", { length: 64 }).notNull(), // 'story', 'code', 'document'
  relatedId: integer("related_id"), // ID of related story or knowledge chunk
  relatedTitle: text("related_title").notNull(),
  relatedTeamId: integer("related_team_id").references(() => teams.id, { onDelete: "set null" }),
  
  // Similarity analysis
  similarityType: storySimilarityTypeEnum("similarity_type").notNull(),
  similarityScore: integer("similarity_score").notNull(), // 0-100
  explanation: text("explanation").notNull(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type StorySimilarity = typeof storySimilarities.$inferSelect;
export type InsertStorySimilarity = typeof storySimilarities.$inferInsert;

/**
 * Knowledge chat sessions - track conversations for context
 */
export const knowledgeChatSessions = pgTable("knowledge_chat_sessions", {
  id: serial("id").primaryKey(),
  companyId: integer("company_id").notNull().references(() => companies.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 512 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type KnowledgeChatSession = typeof knowledgeChatSessions.$inferSelect;
export type InsertKnowledgeChatSession = typeof knowledgeChatSessions.$inferInsert;

/**
 * Knowledge chat messages - individual messages in a chat session
 */
export const knowledgeChatMessages = pgTable("knowledge_chat_messages", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").notNull().references(() => knowledgeChatSessions.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 32 }).notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  
  // Citations - which chunks were used to generate this response
  citations: jsonb("citations"), // Array of { chunkId, sourceId, sourceName, excerpt }
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type KnowledgeChatMessage = typeof knowledgeChatMessages.$inferSelect;
export type InsertKnowledgeChatMessage = typeof knowledgeChatMessages.$inferInsert;
