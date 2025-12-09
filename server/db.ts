import { desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users,
  llmConfigs, InsertLlmConfig,
  jiraConfigs, InsertJiraConfig,
  features, InsertFeature,
  userStories, InsertUserStory,
  acceptanceCriteria, InsertAcceptanceCriterion
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
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

// LLM Config queries
export async function getLlmConfigByUserId(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(llmConfigs).where(eq(llmConfigs.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertLlmConfig(config: InsertLlmConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getLlmConfigByUserId(config.userId);
  
  if (existing) {
    await db.update(llmConfigs)
      .set({ ...config, updatedAt: new Date() })
      .where(eq(llmConfigs.userId, config.userId));
    return getLlmConfigByUserId(config.userId);
  } else {
    await db.insert(llmConfigs).values(config);
    return getLlmConfigByUserId(config.userId);
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
  return db.select().from(userStories).where(eq(userStories.featureId, featureId)).orderBy(userStories.orderIndex);
}

export async function updateUserStory(id: number, data: Partial<InsertUserStory>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(userStories).set({ ...data, updatedAt: new Date() }).where(eq(userStories.id, id));
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
