/**
 * Azure DevOps - Estrutura Melhorada
 * Separa credenciais de projetos. Tudo pertence à empresa.
 */

import { eq, and, desc } from "drizzle-orm";
import { getDb } from "./db";
import {
  azureDevOpsCredentials,
  azureDevOpsProjects,
  InsertAzureDevOpsProject
} from "../drizzle/schema-azure-improved";
import { decryptSecret, encryptSecret } from "./_core/secret-box";

// ============ CREDENCIAIS ============

export async function getCredentials(companyId: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(azureDevOpsCredentials)
    .where(eq(azureDevOpsCredentials.companyId, companyId))
    .limit(1);

  return result[0] || null;
}

/** PAT em texto puro, só para chamadas ao Azure. Linhas antigas foram gravadas sem criptografia. */
export function revealPat(stored: string): string {
  return stored.startsWith("v1:") ? decryptSecret(stored) : stored;
}

/** Credenciais sem o token, para devolver ao cliente */
export function publicCredentials(credentials: Awaited<ReturnType<typeof getCredentials>>) {
  if (!credentials) return null;
  return {
    organization: credentials.organization,
    hasPat: Boolean(credentials.pat),
    updatedAt: credentials.updatedAt,
  };
}

/** pat ausente mantém o token salvo */
export async function saveCredentials(data: { companyId: number; userId: number; organization: string; pat?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const existing = await getCredentials(data.companyId);
  const pat = data.pat ? encryptSecret(data.pat) : existing?.pat;
  if (!pat) throw new Error("Personal Access Token é obrigatório");

  if (existing) {
    await db
      .update(azureDevOpsCredentials)
      .set({ organization: data.organization, pat, userId: data.userId, updatedAt: new Date() })
      .where(eq(azureDevOpsCredentials.id, existing.id));
  } else {
    await db.insert(azureDevOpsCredentials).values({
      companyId: data.companyId,
      userId: data.userId,
      organization: data.organization,
      pat,
    });
  }
  return getCredentials(data.companyId);
}

// ============ PROJETOS ============

export async function getProjects(companyId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(azureDevOpsProjects)
    .where(
      and(
        eq(azureDevOpsProjects.companyId, companyId),
        eq(azureDevOpsProjects.isActive, true)
      )
    )
    .orderBy(desc(azureDevOpsProjects.createdAt));
}

/** Projeto ativo da empresa, ou null se não existir / for de outra empresa */
export async function getCompanyProject(companyId: number, id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(azureDevOpsProjects)
    .where(
      and(
        eq(azureDevOpsProjects.id, id),
        eq(azureDevOpsProjects.companyId, companyId),
        eq(azureDevOpsProjects.isActive, true)
      )
    )
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

export async function updateProject(companyId: number, id: number, data: Partial<InsertAzureDevOpsProject>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(azureDevOpsProjects)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(and(eq(azureDevOpsProjects.id, id), eq(azureDevOpsProjects.companyId, companyId)));

  return getCompanyProject(companyId, id);
}

export async function deleteProject(companyId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Soft delete
  await db
    .update(azureDevOpsProjects)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(azureDevOpsProjects.id, id), eq(azureDevOpsProjects.companyId, companyId)));
}

// ============ HELPER ============

export async function getFullConfig(companyId: number) {
  const [credentials, projects] = await Promise.all([getCredentials(companyId), getProjects(companyId)]);

  return {
    credentials: publicCredentials(credentials),
    projects,
  };
}
