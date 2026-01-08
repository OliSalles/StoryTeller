import { integer, pgEnum, pgTable, text, timestamp, varchar, serial, boolean } from "drizzle-orm/pg-core";

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
  /** Email do usuário - único e obrigatório */
  email: varchar("email", { length: 320 }).notNull().unique(),
  /** Hash da senha do usuário */
  password: varchar("password", { length: 255 }).notNull(),
  /** Nome completo do usuário */
  name: text("name").notNull(),
  /** Manus OAuth identifier (openId) - opcional para compatibilidade */
  openId: varchar("openId", { length: 64 }).unique(),
  loginMethod: varchar("loginMethod", { length: 64 }).default("local"),
  role: roleEnum("role").default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * LLM configuration table - stores global LLM settings (admin only)
 * Single row configuration shared by all users
 */
export const llmConfigs = pgTable("llm_configs", {
  id: serial("id").primaryKey(),
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

/**
 * Token usage table - tracks LLM token consumption
 */
export const tokenUsage = pgTable("token_usage", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  featureId: integer("feature_id"),
  operation: varchar("operation", { length: 128 }).notNull(), // "feature_generation", "consolidation", etc
  model: varchar("model", { length: 128 }).notNull(),
  promptTokens: integer("prompt_tokens").notNull(),
  completionTokens: integer("completion_tokens").notNull(),
  totalTokens: integer("total_tokens").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TokenUsage = typeof tokenUsage.$inferSelect;
export type InsertTokenUsage = typeof tokenUsage.$inferInsert;

/**
 * Subscription system - Plans, Subscriptions, Payments
 */

// Subscription status enum
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
  "incomplete"
]);

// Billing cycle enum
export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "yearly"]);

// Subscription plans table
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(), // 'free', 'pro', 'business'
  displayName: varchar("display_name", { length: 128 }).notNull(),
  priceMonthly: integer("price_monthly"), // Em centavos: 4900 = R$ 49,00
  priceYearly: integer("price_yearly"), // Em centavos: 49000 = R$ 490,00
  featuresLimit: integer("features_limit"), // NULL = unlimited
  tokensLimit: integer("tokens_limit"), // NULL = unlimited
  canExportJira: boolean("can_export_jira").default(false),
  canExportAzure: boolean("can_export_azure").default(false),
  hasApiAccess: boolean("has_api_access").default(false),
  hasPrioritySupport: boolean("has_priority_support").default(false),
  hasTrialDays: integer("has_trial_days").default(0), // 0 = sem trial
  isActive: boolean("is_active").default(true),
  stripeMonthlyPriceId: varchar("stripe_monthly_price_id", { length: 255 }),
  stripeYearlyPriceId: varchar("stripe_yearly_price_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type InsertSubscriptionPlan = typeof subscriptionPlans.$inferInsert;

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  status: subscriptionStatusEnum("status").notNull(),
  billingCycle: billingCycleEnum("billing_cycle").notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  
  // External IDs from Stripe
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  
  // Usage tracking for current period
  tokensUsedThisPeriod: integer("tokens_used_this_period").default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

// Payments table
export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").notNull().references(() => subscriptions.id),
  amount: integer("amount").notNull(), // Em centavos
  currency: varchar("currency", { length: 3 }).default("BRL"),
  status: varchar("status", { length: 32 }).notNull(), // 'succeeded', 'failed', 'pending'
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  paymentMethod: varchar("payment_method", { length: 64 }), // 'card'
  errorMessage: text("error_message"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ============================================
// Azure DevOps - Estrutura Melhorada
// ============================================
export * from "./schema-azure-improved";