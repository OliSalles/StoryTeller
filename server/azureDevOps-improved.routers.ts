/**
 * Azure DevOps - Rotas Melhoradas
 * Separação entre credenciais e projetos
 */

import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import * as azureDb from "./azureDevOps-improved";

export const azureDevOpsImprovedRouter = router({
  // ============ CREDENCIAIS ============
  
  credentials: router({
    // Obter credenciais do usuário
    get: protectedProcedure.query(async ({ ctx }) => {
      return await azureDb.getCredentials(ctx.user.id);
    }),
    
    // Salvar/Atualizar credenciais
    save: protectedProcedure
      .input(
        z.object({
          organization: z.string().min(1, "Organização é obrigatória"),
          pat: z.string().min(1, "Personal Access Token é obrigatório"),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await azureDb.saveCredentials({
          userId: ctx.user.id,
          organization: input.organization,
          pat: input.pat,
        });
      }),
  }),
  
  // ============ PROJETOS ============
  
  projects: router({
    // Listar projetos do usuário
    list: protectedProcedure.query(async ({ ctx }) => {
      return await azureDb.getProjects(ctx.user.id);
    }),
    
    // Obter projeto específico
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await azureDb.getProjectById(input.id);
      }),
    
    // Criar novo projeto
    create: protectedProcedure
      .input(
        z.object({
          name: z.string().min(1, "Nome é obrigatório"),
          defaultArea: z.string().optional(),
          defaultIteration: z.string().optional(),
          defaultState: z.string().optional(),
          defaultBoard: z.string().optional(),
          defaultColumn: z.string().optional(),
          defaultSwimlane: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await azureDb.createProject({
          userId: ctx.user.id,
          ...input,
        });
      }),
    
    // Atualizar projeto
    update: protectedProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          defaultArea: z.string().optional(),
          defaultIteration: z.string().optional(),
          defaultState: z.string().optional(),
          defaultBoard: z.string().optional(),
          defaultColumn: z.string().optional(),
          defaultSwimlane: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await azureDb.updateProject(id, data);
      }),
    
    // Deletar projeto (soft delete)
    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await azureDb.deleteProject(input.id);
        return { success: true };
      }),
  }),
  
  // ============ HELPER ============
  
  // Obter configuração completa (credenciais + projetos)
  getFullConfig: protectedProcedure.query(async ({ ctx }) => {
    return await azureDb.getFullConfig(ctx.user.id);
  }),
});

