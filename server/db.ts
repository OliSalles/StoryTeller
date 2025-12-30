import { eq, desc, and, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pkg from 'pg';
const { Pool } = pkg;
import {
  InsertUser,
  users,
  llmConfigs,
  InsertLlmConfig,
  jiraConfigs,
  InsertJiraConfig,
  azureDevOpsConfigs,
  InsertAzureDevOpsConfig,
  features,
  InsertFeature,
  userStories,
  InsertUserStory,
  acceptanceCriteria,
  InsertAcceptanceCriterion,
  tasks,
  InsertTask,
  executionLogs,
  InsertExecutionLog,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: typeof Pool.prototype | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _pool = new Pool({
        connectionString: process.env.DATABASE_URL,
      });
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: Partial<InsertUser> & {email: string}): Promise<void>;
export async function upsertUser(user: Partial<InsertUser> & {openId: string}): Promise<void>;
export async function upsertUser(user: Partial<InsertUser>): Promise<void> {
  // Validar que pelo menos email ou openId está presente
  if (!user.email && !user.openId) {
    throw new Error("User email or openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    // Se for atualização apenas (sem criar novo), buscar usuário existente
    if (!user.name && !user.password && user.email) {
      const existingUser = await getUserByEmail(user.email);
      if (existingUser) {
        // Apenas atualizar campos fornecidos
        const updateData: any = {};
        if (user.lastSignedIn !== undefined) updateData.lastSignedIn = user.lastSignedIn;
        if (user.role !== undefined) updateData.role = user.role;
        if (user.loginMethod !== undefined) updateData.loginMethod = user.loginMethod;
        
        if (Object.keys(updateData).length > 0) {
          await db.update(users)
            .set(updateData)
            .where(eq(users.email, user.email));
        }
        return;
      }
    }

    // Criar ou atualizar com todos os campos
    const values: any = {};
    const updateSet: Record<string, unknown> = {};

    if (user.email) {
      values.email = user.email;
    }
    if (user.openId) {
      values.openId = user.openId;
      updateSet.openId = user.openId;
    }
    if (user.name) {
      values.name = user.name;
      updateSet.name = user.name;
    }
    if (user.password) {
      values.password = user.password;
      updateSet.password = user.password;
    }
    if (user.loginMethod !== undefined) {
      values.loginMethod = user.loginMethod;
      updateSet.loginMethod = user.loginMethod;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    // Usar email como target do conflict (chave única principal)
    await db.insert(users).values(values).onConflictDoUpdate({
      target: users.email,
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createUser(user: { email: string; password: string; name: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(users).values({
    email: user.email,
    password: user.password,
    name: user.name,
    loginMethod: "local",
    lastSignedIn: new Date(),
  }).returning({ id: users.id });

  return result[0]?.id;
}

// LLM Config queries - Global configuration (admin only)
export async function getGlobalLlmConfig() {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(llmConfigs).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertGlobalLlmConfig(config: Omit<InsertLlmConfig, 'userId'>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getGlobalLlmConfig();
  
  if (existing) {
    await db.update(llmConfigs)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(llmConfigs.id, existing.id));
    return getGlobalLlmConfig();
  } else {
    await db.insert(llmConfigs).values(config);
    return getGlobalLlmConfig();
  }
}

// Jira Config queries
export async function getJiraConfigByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jiraConfigs).where(eq(jiraConfigs.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertJiraConfig(config: InsertJiraConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getJiraConfigByUserId(config.userId);
  
  if (existing) {
    await db.update(jiraConfigs)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(jiraConfigs.userId, config.userId));
    return getJiraConfigByUserId(config.userId);
  } else {
    await db.insert(jiraConfigs).values(config);
    return getJiraConfigByUserId(config.userId);
  }
}

// Feature queries
export async function createFeature(feature: InsertFeature) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(features).values(feature);
  const result = await db.select().from(features).where(eq(features.userId, feature.userId)).orderBy(desc(features.id)).limit(1);
  return result[0]?.id ?? 0;
}

export async function getFeaturesByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(features).where(eq(features.userId, userId)).orderBy(desc(features.createdAt));
}

export async function getFeatureById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(features).where(eq(features.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateFeature(id: number, data: Partial<InsertFeature>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(features).set({ ...data, updatedAt: new Date() }).where(eq(features.id, id));
  return getFeatureById(id);
}

// User Story queries
export async function createUserStory(story: InsertUserStory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(userStories).values(story);
  const result = await db.select().from(userStories).where(eq(userStories.featureId, story.featureId)).orderBy(desc(userStories.id)).limit(1);
  return result[0]?.id ?? 0;
}

export async function getUserStoriesByFeatureId(featureId: number) {
  const db = await getDb();
  if (!db) return [];
  
  // Get all user stories for this feature
  const stories = await db
    .select()
    .from(userStories)
    .where(eq(userStories.featureId, featureId))
    .orderBy(userStories.orderIndex);
  
  // For each story, get its acceptance criteria and tasks
  const storiesWithDetails = await Promise.all(
    stories.map(async (story) => {
      const criteria = await db
        .select()
        .from(acceptanceCriteria)
        .where(eq(acceptanceCriteria.userStoryId, story.id));
      
      const storyTasks = await db
        .select()
        .from(tasks)
        .where(eq(tasks.userStoryId, story.id))
        .orderBy(tasks.orderIndex);
      
      return {
        ...story,
        acceptanceCriteria: criteria,
        tasks: storyTasks,
      };
    })
  );
  
  return storiesWithDetails;
}

export async function updateUserStory(id: number, data: Partial<InsertUserStory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userStories).set({ ...data, updatedAt: new Date() }).where(eq(userStories.id, id));
}

export async function updateAcceptanceCriterion(id: number, criterion: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(acceptanceCriteria).set({ criterion }).where(eq(acceptanceCriteria.id, id));
}

// Acceptance Criteria queries
export async function createAcceptanceCriterion(criterion: InsertAcceptanceCriterion) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(acceptanceCriteria).values(criterion);
  const result = await db.select().from(acceptanceCriteria).where(eq(acceptanceCriteria.userStoryId, criterion.userStoryId)).orderBy(desc(acceptanceCriteria.id)).limit(1);
  return result[0]?.id ?? 0;
}

export async function getAcceptanceCriteriaByStoryId(userStoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(acceptanceCriteria).where(eq(acceptanceCriteria.userStoryId, userStoryId)).orderBy(acceptanceCriteria.orderIndex);
}

// Azure DevOps configuration functions
export async function getAzureDevOpsConfigByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(azureDevOpsConfigs).where(eq(azureDevOpsConfigs.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertAzureDevOpsConfig(config: InsertAzureDevOpsConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getAzureDevOpsConfigByUserId(config.userId);
  
  if (existing) {
    await db.update(azureDevOpsConfigs)
      .set({
        organization: config.organization,
        project: config.project,
        pat: config.pat,
        defaultArea: config.defaultArea,
        defaultIteration: config.defaultIteration,
        defaultState: config.defaultState,
        defaultBoard: config.defaultBoard,
        defaultColumn: config.defaultColumn,
        defaultSwimlane: config.defaultSwimlane,
        updatedAt: new Date(),
      })
      .where(eq(azureDevOpsConfigs.userId, config.userId));
    return await getAzureDevOpsConfigByUserId(config.userId);
  } else {
    await db.insert(azureDevOpsConfigs).values(config);
    return await getAzureDevOpsConfigByUserId(config.userId);
  }
}

// Delete functions for refinement
export async function deleteUserStoriesByFeatureId(featureId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // First get all stories to delete their criteria
  const stories = await getUserStoriesByFeatureId(featureId);
  for (const story of stories) {
    await db.delete(acceptanceCriteria).where(eq(acceptanceCriteria.userStoryId, story.id));
  }
  
  // Then delete the stories
  await db.delete(userStories).where(eq(userStories.featureId, featureId));
}

export async function deleteAcceptanceCriteriaByStoryId(userStoryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(acceptanceCriteria).where(eq(acceptanceCriteria.userStoryId, userStoryId));
}

// Task queries
export async function createTask(task: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(tasks).values(task);
  const result = await db.select().from(tasks).where(eq(tasks.userStoryId, task.userStoryId)).orderBy(desc(tasks.id)).limit(1);
  return result[0]?.id ?? 0;
}

export async function getTasksByStoryId(userStoryId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tasks).where(eq(tasks.userStoryId, userStoryId)).orderBy(tasks.orderIndex);
}

export async function deleteTasksByStoryId(userStoryId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(tasks).where(eq(tasks.userStoryId, userStoryId));
}

// Execution Logs functions
export async function createExecutionLog(log: InsertExecutionLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(executionLogs).values(log).returning({ id: executionLogs.id });
  return result[0]?.id ?? 0;
}

export async function updateExecutionLog(id: number, updates: Partial<InsertExecutionLog>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(executionLogs).set(updates).where(eq(executionLogs.id, id));
}

export async function getExecutionLogsByUserId(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(executionLogs).where(eq(executionLogs.userId, userId)).orderBy(desc(executionLogs.createdAt));
}

export async function getExecutionLogById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(executionLogs).where(eq(executionLogs.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getActiveExecutionByUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(executionLogs)
    .where(and(
      eq(executionLogs.userId, userId),
      or(
        eq(executionLogs.status, "started"),
        eq(executionLogs.status, "processing")
      )
    ))
    .orderBy(desc(executionLogs.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function deleteFeature(featureId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Delete feature (cascade will automatically delete related stories and tasks)
  await db.delete(features).where(eq(features.id, featureId));
}
