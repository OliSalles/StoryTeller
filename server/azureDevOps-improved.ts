/**
 * Azure DevOps - Estrutura Melhorada
 * Separa credenciais de projetos
 */

import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import { 
  azureDevOpsCredentials, 
  azureDevOpsProjects,
  InsertAzureDevOpsCredentials,
  InsertAzureDevOpsProject
} from "../drizzle/schema-azure-improved";

// ============ CREDENCIAIS ============

export async function getCredentials(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(azureDevOpsCredentials)
    .where(eq(azureDevOpsCredentials.userId, userId))
    .limit(1);
  
  return result[0] || null;
}

export async function saveCredentials(data: InsertAzureDevOpsCredentials) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Validação explícita
  if (!data.userId) {
    throw new Error("userId is required");
  }
  
  console.log("[Azure DevOps] Saving credentials for userId:", data.userId);
  
  const existing = await getCredentials(data.userId);
  
  if (existing) {
    // Atualizar credenciais existentes
    console.log("[Azure DevOps] Updating existing credentials");
    await db
      .update(azureDevOpsCredentials)
      .set({
        organization: data.organization,
        pat: data.pat,
        updatedAt: new Date(),
      })
      .where(eq(azureDevOpsCredentials.userId, data.userId));
    
    return await getCredentials(data.userId);
  } else {
    // Criar novas credenciais com valores explícitos
    console.log("[Azure DevOps] Creating new credentials");
    await db.insert(azureDevOpsCredentials).values({
      userId: data.userId,
      organization: data.organization,
      pat: data.pat,
    });
    return await getCredentials(data.userId);
  }
}

// ============ PROJETOS ============

export async function getProjects(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(azureDevOpsProjects)
    .where(
      and(
        eq(azureDevOpsProjects.userId, userId),
        eq(azureDevOpsProjects.isActive, true)
      )
    )
    .orderBy(desc(azureDevOpsProjects.createdAt));
}

export async function getProjectById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(azureDevOpsProjects)
    .where(eq(azureDevOpsProjects.id, id))
    .limit(1);
  
  return result[0] || null;
}

export async function createProject(data: InsertAzureDevOpsProject) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db
    .insert(azureDevOpsProjects)
    .values(data)
    .returning();
  
  return result[0];
}

export async function updateProject(id: number, data: Partial<InsertAzureDevOpsProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(azureDevOpsProjects)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(azureDevOpsProjects.id, id));
  
  return await getProjectById(id);
}

export async function deleteProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Soft delete
  await db
    .update(azureDevOpsProjects)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(azureDevOpsProjects.id, id));
}

export async function hardDeleteProject(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .delete(azureDevOpsProjects)
    .where(eq(azureDevOpsProjects.id, id));
}

// ============ HELPER ============

export async function getFullConfig(userId: number) {
  const credentials = await getCredentials(userId);
  const projects = await getProjects(userId);
  
  return {
    credentials,
    projects,
  };
}


