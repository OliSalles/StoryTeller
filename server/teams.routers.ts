import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { tenantProcedure, router } from "./_core/trpc";
import * as knowledgeDb from "./knowledge-db";
import { guardCompanyAdmin } from "./_core/tenant-guard";

export const teamsRouter = router({
  /**
   * Create a new team within company
   */
  create: tenantProcedure
    .input(
      z.object({
        name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Use company from tenant context
      const companyId = ctx.tenant.companyId;
      
      // Only admins can create teams
      await guardCompanyAdmin(ctx.user.id, companyId);
      
      const teamId = await knowledgeDb.createTeam({
        companyId,
        name: input.name,
        description: input.description,
      });
      
      return { teamId, name: input.name };
    }),

  /**
   * List teams in company
   */
  list: tenantProcedure.query(async ({ ctx }) => {
    return knowledgeDb.getTeamsByCompanyId(ctx.tenant.companyId);
  }),

  /**
   * Get team details
   */
  getById: tenantProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const team = await knowledgeDb.getTeamById(input.id);
      
      if (!team) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time não encontrado",
        });
      }
      
      // Check team belongs to user's company
      if (team.companyId !== ctx.tenant.companyId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para acessar este time",
        });
      }
      
      // Get team members
      const members = await knowledgeDb.getTeamMembers(input.id);
      
      return { ...team, members };
    }),

  /**
   * Update team (admin only)
   */
  update: tenantProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(2).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const team = await knowledgeDb.getTeamById(input.id);
      
      if (!team || team.companyId !== ctx.tenant.companyId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time não encontrado",
        });
      }
      
      await guardCompanyAdmin(ctx.user.id, team.companyId);
      
      const { id, ...data } = input;
      return knowledgeDb.updateTeam(id, data);
    }),

  /**
   * Delete team (admin only)
   */
  delete: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const team = await knowledgeDb.getTeamById(input.id);
      
      if (!team || team.companyId !== ctx.tenant.companyId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time não encontrado",
        });
      }
      
      await guardCompanyAdmin(ctx.user.id, team.companyId);
      
      await knowledgeDb.deleteTeam(input.id);
      return { success: true };
    }),

  /**
   * Add member to team (admin only)
   */
  addMember: tenantProcedure
    .input(
      z.object({
        teamId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const team = await knowledgeDb.getTeamById(input.teamId);
      
      if (!team || team.companyId !== ctx.tenant.companyId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time não encontrado",
        });
      }
      
      await guardCompanyAdmin(ctx.user.id, team.companyId);
      
      // Check if user is a company member
      const companyMember = await knowledgeDb.getCompanyMember(team.companyId, input.userId);
      if (!companyMember) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Usuário não é membro da empresa",
        });
      }
      
      const memberId = await knowledgeDb.addTeamMember({
        teamId: input.teamId,
        userId: input.userId,
      });
      
      return { memberId };
    }),

  /**
   * Remove member from team (admin only)
   */
  removeMember: tenantProcedure
    .input(
      z.object({
        teamId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const team = await knowledgeDb.getTeamById(input.teamId);
      
      if (!team || team.companyId !== ctx.tenant.companyId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time não encontrado",
        });
      }
      
      await guardCompanyAdmin(ctx.user.id, team.companyId);
      
      await knowledgeDb.removeTeamMember(input.teamId, input.userId);
      return { success: true };
    }),

  /**
   * Get user's teams within company
   */
  myTeams: tenantProcedure.query(async ({ ctx }) => {
    return knowledgeDb.getUserTeams(ctx.user.id, ctx.tenant.companyId);
  }),
});
