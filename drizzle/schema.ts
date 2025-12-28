import { integer, pgEnum, pgTable, text, timestamp, varchar, serial } from "drizzle-orm/pg-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const roleEnum = pgEnum("role", ["user", "admin"]);

export const users = pgTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: serial("id").primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * LLM configuration table - stores user's LLM settings
 */
export const llmConfigs = pgTable("llm_configs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  provider: varchar("provider", { length: 64 }).notNull().default("openai"),
  model: varchar("model", { length: 128 }).notNull().default("gpt-4"),
  apiKey: text("api_key"),
  temperature: varchar("temperature", { length: 10 }).default("0.7"),
  maxTokens: integer("max_tokens").default(2000),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type LlmConfig = typeof llmConfigs.$inferSelect;
export type InsertLlmConfig = typeof llmConfigs.$inferInsert;

/**
 * Jira configuration table - stores user's Jira integration settings
 */
export const jiraConfigs = pgTable("jira_configs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  jiraUrl: varchar("jira_url", { length: 512 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  apiToken: text("api_token").notNull(),
  defaultProject: varchar("default_project", { length: 128 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type JiraConfig = typeof jiraConfigs.$inferSelect;
export type InsertJiraConfig = typeof jiraConfigs.$inferInsert;

/**
 * Azure DevOps configuration table - stores user's Azure DevOps integration settings
 */
export const azureDevOpsConfigs = pgTable("azure_devops_configs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  organization: varchar("organization", { length: 256 }).notNull(),
  project: varchar("project", { length: 256 }).notNull(),
  pat: text("pat").notNull(),
  defaultArea: varchar("default_area", { length: 256 }),
  defaultIteration: varchar("default_iteration", { length: 256 }),
  defaultState: varchar("default_state", { length: 128 }),
  defaultBoard: varchar("default_board", { length: 256 }),
  defaultColumn: varchar("default_column", { length: 128 }),
  defaultSwimlane: varchar("default_swimlane", { length: 128 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AzureDevOpsConfig = typeof azureDevOpsConfigs.$inferSelect;
export type InsertAzureDevOpsConfig = typeof azureDevOpsConfigs.$inferInsert;

/**
 * Features table - stores generated features
 */
export const languageEnum = pgEnum("language", ["pt", "en"]);
export const statusEnum = pgEnum("status", ["draft", "exported", "archived"]);
export const exportTargetEnum = pgEnum("export_target", ["jira", "azure_devops"]);

export const features = pgTable("features", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description").notNull(),
  originalPrompt: text("original_prompt").notNull(),
  language: languageEnum("language").default("pt").notNull(),
  status: statusEnum("status").default("draft").notNull(),
  exportTarget: exportTargetEnum("export_target"),
  jiraIssueKey: varchar("jira_issue_key", { length: 64 }),
  azureDevOpsWorkItemId: integer("azure_devops_work_item_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Feature = typeof features.$inferSelect;
export type InsertFeature = typeof features.$inferInsert;

/**
 * User stories table - stores user stories for features
 */
export const priorityEnum = pgEnum("priority", ["low", "medium", "high", "critical"]);

export const userStories = pgTable("user_stories", {
  id: serial("id").primaryKey(),
  featureId: integer("feature_id").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description").notNull(),
  priority: priorityEnum("priority").default("medium").notNull(),
  storyPoints: integer("story_points"),
  jiraIssueKey: varchar("jira_issue_key", { length: 64 }),
  azureDevOpsWorkItemId: integer("azure_devops_work_item_id"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserStory = typeof userStories.$inferSelect;
export type InsertUserStory = typeof userStories.$inferInsert;

/**
 * Acceptance criteria table - stores acceptance criteria for user stories
 */
export const acceptanceCriteria = pgTable("acceptance_criteria", {
  id: serial("id").primaryKey(),
  userStoryId: integer("user_story_id").notNull(),
  criterion: text("criterion").notNull(),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AcceptanceCriterion = typeof acceptanceCriteria.$inferSelect;
export type InsertAcceptanceCriterion = typeof acceptanceCriteria.$inferInsert;
/**
 * Tasks table - stores technical tasks for each user story
 */
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userStoryId: integer("user_story_id").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description"),
  estimatedHours: integer("estimated_hours"),
  jiraIssueKey: varchar("jira_issue_key", { length: 64 }),
  azureDevOpsWorkItemId: integer("azure_devops_work_item_id"),
  orderIndex: integer("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;

/**
 * Execution logs table for debugging feature generation
 */
export const executionStatusEnum = pgEnum("execution_status", ["started", "processing", "success", "error"]);

export const executionLogs = pgTable("execution_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  featureId: integer("feature_id"),
  status: executionStatusEnum("status").notNull(),
  promptLength: integer("prompt_length").notNull(),
  chunksCount: integer("chunks_count").default(0),
  totalStories: integer("total_stories").default(0),
  aiResponse: text("ai_response"),
  errorMessage: text("error_message"),
  startTime: timestamp("start_time").defaultNow().notNull(),
  endTime: timestamp("end_time"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type ExecutionLog = typeof executionLogs.$inferSelect;
export type InsertExecutionLog = typeof executionLogs.$inferInsert;
