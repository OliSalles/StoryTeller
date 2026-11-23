import { pgTable, serial, varchar, integer, timestamp, text, boolean } from "drizzle-orm/pg-core";

/**
 * Azure DevOps - Estrutura Melhorada
 * Separa credenciais (org + token) de projetos
 * Pertencem à empresa: só admins da empresa alteram, todos os membros exportam
 */

// Credenciais do Azure DevOps (1 por empresa)
export const azureDevOpsCredentials = pgTable("azure_devops_credentials", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Quem salvou por último
  companyId: integer("company_id").unique(),
  organization: varchar("organization", { length: 256 }).notNull(),
  pat: text("pat").notNull(), // Personal Access Token, criptografado (secret-box)
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AzureDevOpsCredentials = typeof azureDevOpsCredentials.$inferSelect;
export type InsertAzureDevOpsCredentials = typeof azureDevOpsCredentials.$inferInsert;

// Projetos do Azure DevOps (múltiplos por empresa)
export const azureDevOpsProjects = pgTable("azure_devops_projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(), // Quem criou
  companyId: integer("company_id"),
  name: varchar("name", { length: 256 }).notNull(), // Nome do projeto no Azure DevOps
  
  // Configurações padrão (opcionais)
  defaultArea: varchar("default_area", { length: 256 }),
  defaultIteration: varchar("default_iteration", { length: 256 }),
  defaultState: varchar("default_state", { length: 128 }),
  defaultBoard: varchar("default_board", { length: 256 }),
  defaultColumn: varchar("default_column", { length: 128 }),
  defaultSwimlane: varchar("default_swimlane", { length: 128 }),
  
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AzureDevOpsProject = typeof azureDevOpsProjects.$inferSelect;
export type InsertAzureDevOpsProject = typeof azureDevOpsProjects.$inferInsert;

