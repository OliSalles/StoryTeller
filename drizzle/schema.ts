import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * LLM configuration table - stores user's LLM settings
 */
export const llmConfigs = mysqlTable("llm_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  provider: varchar("provider", { length: 64 }).notNull().default("openai"),
  model: varchar("model", { length: 128 }).notNull().default("gpt-4"),
  apiKey: text("api_key"),
  temperature: varchar("temperature", { length: 10 }).default("0.7"),
  maxTokens: int("max_tokens").default(2000),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type LlmConfig = typeof llmConfigs.$inferSelect;
export type InsertLlmConfig = typeof llmConfigs.$inferInsert;

/**
 * Jira configuration table - stores user's Jira integration settings
 */
export const jiraConfigs = mysqlTable("jira_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  jiraUrl: varchar("jira_url", { length: 512 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  apiToken: text("api_token").notNull(),
  defaultProject: varchar("default_project", { length: 128 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type JiraConfig = typeof jiraConfigs.$inferSelect;
export type InsertJiraConfig = typeof jiraConfigs.$inferInsert;

/**
 * Azure DevOps configuration table - stores user's Azure DevOps integration settings
 */
export const azureDevOpsConfigs = mysqlTable("azure_devops_configs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
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
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type AzureDevOpsConfig = typeof azureDevOpsConfigs.$inferSelect;
export type InsertAzureDevOpsConfig = typeof azureDevOpsConfigs.$inferInsert;

/**
 * Features table - stores generated features
 */
export const features = mysqlTable("features", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description").notNull(),
  originalPrompt: text("original_prompt").notNull(),
  language: mysqlEnum("language", ["pt", "en"]).default("pt").notNull(),
  status: mysqlEnum("status", ["draft", "exported", "archived"]).default("draft").notNull(),
  exportTarget: mysqlEnum("export_target", ["jira", "azure_devops"]),
  jiraIssueKey: varchar("jira_issue_key", { length: 64 }),
  azureDevOpsWorkItemId: int("azure_devops_work_item_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Feature = typeof features.$inferSelect;
export type InsertFeature = typeof features.$inferInsert;

/**
 * User stories table - stores user stories for features
 */
export const userStories = mysqlTable("user_stories", {
  id: int("id").autoincrement().primaryKey(),
  featureId: int("feature_id").notNull(),
  title: varchar("title", { length: 512 }).notNull(),
  description: text("description").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "critical"]).default("medium").notNull(),
  storyPoints: int("story_points"),
  jiraIssueKey: varchar("jira_issue_key", { length: 64 }),
  azureDevOpsWorkItemId: int("azure_devops_work_item_id"),
  orderIndex: int("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type UserStory = typeof userStories.$inferSelect;
export type InsertUserStory = typeof userStories.$inferInsert;

/**
 * Acceptance criteria table - stores acceptance criteria for user stories
 */
export const acceptanceCriteria = mysqlTable("acceptance_criteria", {
  id: int("id").autoincrement().primaryKey(),
  userStoryId: int("user_story_id").notNull(),
  criterion: text("criterion").notNull(),
  orderIndex: int("order_index").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type AcceptanceCriterion = typeof acceptanceCriteria.$inferSelect;
export type InsertAcceptanceCriterion = typeof acceptanceCriteria.$inferInsert;