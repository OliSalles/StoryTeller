import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, tenantProcedure, router } from "./_core/trpc";
import * as knowledgeDb from "./knowledge-db";
import { guardCompanyAdmin, guardCompanyOwner } from "./_core/tenant-guard";

export const companiesRouter = router({
  /**
   * Create a new company
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, "Nome deve ter no mínimo 2 caracteres"),
        slug: z.string().min(2, "Slug deve ter no mínimo 2 caracteres").regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if slug is already taken
      const existing = await knowledgeDb.getCompanyBySlug(input.slug);
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este slug já está em uso. Por favor, escolha outro.",
        });
      }
      
      // Create company
      const companyId = await knowledgeDb.createCompany({
        name: input.name,
        slug: input.slug,
        ownerId: ctx.user.id,
      });
      
      // Add creator as owner member
      await knowledgeDb.addCompanyMember({
        companyId,
        userId: ctx.user.id,
        role: 'owner',
      });
      
      return { companyId, name: input.name, slug: input.slug };
    }),

  /**
   * List companies user belongs to
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return knowledgeDb.getCompaniesByUserId(ctx.user.id);
  }),

  /**
   * Get company details
   */
  getById: tenantProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const company = await knowledgeDb.getCompanyById(input.id);
      
      if (!company) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Empresa não encontrada",
        });
      }
      
      // Check access
      const member = await knowledgeDb.getCompanyMember(input.id, ctx.user.id);
      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para acessar esta empresa",
        });
      }
      
      return { ...company, userRole: member.role };
    }),

  /**
   * Update company details (admin only)
   */
  update: tenantProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(2).optional(),
        slug: z.string().min(2).regex(/^[a-z0-9-]+$/).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await guardCompanyAdmin(ctx.user.id, input.id);
      
      // If slug is being changed, check availability
      if (input.slug) {
        const existing = await knowledgeDb.getCompanyBySlug(input.slug);
        if (existing && existing.id !== input.id) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Este slug já está em uso",
          });
        }
      }
      
      const { id, ...data } = input;
      return knowledgeDb.updateCompany(id, data);
    }),

  /**
   * Delete company (owner only)
   */
  delete: tenantProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await guardCompanyOwner(ctx.user.id, input.id);
      
      await knowledgeDb.deleteCompany(input.id);
      return { success: true };
    }),

  /**
   * List company members
   */
  listMembers: tenantProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ ctx, input }) => {
      const member = await knowledgeDb.getCompanyMember(input.companyId, ctx.user.id);
      if (!member) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Você não tem permissão para ver os membros desta empresa",
        });
      }
      
      return knowledgeDb.getCompanyMembers(input.companyId);
    }),

  /**
   * Invite member (admin only)
   */
  inviteMember: tenantProcedure
    .input(
      z.object({
        companyId: z.number(),
        userId: z.number(),
        role: z.enum(['member', 'admin']).default('member'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await guardCompanyAdmin(ctx.user.id, input.companyId);
      
      // Check if already a member
      const existing = await knowledgeDb.getCompanyMember(input.companyId, input.userId);
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este usuário já é membro da empresa",
        });
      }
      
      const memberId = await knowledgeDb.addCompanyMember({
        companyId: input.companyId,
        userId: input.userId,
        role: input.role,
      });
      
      return { memberId };
    }),

  /**
   * Update member role (admin only)
   */
  updateMemberRole: tenantProcedure
    .input(
      z.object({
        companyId: z.number(),
        userId: z.number(),
        role: z.enum(['member', 'admin', 'owner']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await guardCompanyAdmin(ctx.user.id, input.companyId);
      
      // Only owner can make other owners
      if (input.role === 'owner') {
        await guardCompanyOwner(ctx.user.id, input.companyId);
      }
      
      await knowledgeDb.updateCompanyMemberRole(input.companyId, input.userId, input.role);
      return { success: true };
    }),

  /**
   * Remove member (admin only)
   */
  removeMember: tenantProcedure
    .input(
      z.object({
        companyId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await guardCompanyAdmin(ctx.user.id, input.companyId);
      
      // Cannot remove the owner
      const company = await knowledgeDb.getCompanyById(input.companyId);
      if (company?.ownerId === input.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não é possível remover o proprietário da empresa",
        });
      }
      
      await knowledgeDb.removeCompanyMember(input.companyId, input.userId);
      return { success: true };
    }),
});
