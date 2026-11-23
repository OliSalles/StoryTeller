/**
 * Azure DevOps - Rotas Melhoradas
 * Separação entre credenciais e projetos. A configuração é da empresa ativa:
 * todos os membros veem e exportam, só admins da empresa alteram.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, tenantProcedure } from "./_core/trpc";
import { canManageCompany } from "./_core/tenant-guard";
import * as azureDb from "./azureDevOps-improved";

function assertCanManageAzure(ctx: Parameters<typeof canManageCompany>[0]) {
  if (!canManageCompany(ctx)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Só administradores da empresa podem alterar a conexão com o Azure DevOps",
    });
  }
}

const projectFields = {
  defaultArea: z.string().optional(),
  defaultIteration: z.string().optional(),
  defaultState: z.string().optional(),
  defaultBoard: z.string().optional(),
  defaultColumn: z.string().optional(),
  defaultSwimlane: z.string().optional(),
};

export const azureDevOpsImprovedRouter = router({
  // ============ CREDENCIAIS ============

  credentials: router({
    get: tenantProcedure.query(async ({ ctx }) => {
      return azureDb.publicCredentials(await azureDb.getCredentials(ctx.tenant.companyId));
    }),

    // PAT vazio mantém o token já salvo
    save: tenantProcedure
      .input(
        z.object({
          organization: z.string().trim().min(1, "Organização é obrigatória"),
          pat: z.string().trim().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        assertCanManageAzure(ctx);
        const existing = await azureDb.getCredentials(ctx.tenant.companyId);
        if (!input.pat && !existing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Personal Access Token é obrigatório" });
        }
        const saved = await azureDb.saveCredentials({
          companyId: ctx.tenant.companyId,
          userId: ctx.user.id,
          organization: input.organization,
          pat: input.pat || undefined,
        });
        return azureDb.publicCredentials(saved);
      }),
  }),

  // ============ PROJETOS ============

  projects: router({
    list: tenantProcedure.query(async ({ ctx }) => {
      return azureDb.getProjects(ctx.tenant.companyId);
    }),

    get: tenantProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        return azureDb.getCompanyProject(ctx.tenant.companyId, input.id);
      }),

    create: tenantProcedure
      .input(z.object({ name: z.string().trim().min(1, "Nome é obrigatório"), ...projectFields }))
      .mutation(async ({ ctx, input }) => {
        assertCanManageAzure(ctx);
        return azureDb.createProject({
          ...input,
          userId: ctx.user.id,
          companyId: ctx.tenant.companyId,
        });
      }),

    update: tenantProcedure
      .input(z.object({ id: z.number(), name: z.string().trim().min(1).optional(), ...projectFields }))
      .mutation(async ({ ctx, input }) => {
        assertCanManageAzure(ctx);
        const { id, ...data } = input;
        const project = await azureDb.updateProject(ctx.tenant.companyId, id, data);
        if (!project) throw new TRPCError({ code: "NOT_FOUND", message: "Projeto não encontrado" });
        return project;
      }),

    // Soft delete
    delete: tenantProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        assertCanManageAzure(ctx);
        await azureDb.deleteProject(ctx.tenant.companyId, input.id);
        return { success: true };
      }),
  }),

  // ============ HELPER ============

  getFullConfig: tenantProcedure.query(async ({ ctx }) => {
    return {
      ...(await azureDb.getFullConfig(ctx.tenant.companyId)),
      canManage: canManageCompany(ctx),
    };
  }),
});
