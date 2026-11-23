import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, tenantProcedure, router } from "./_core/trpc";
import * as knowledgeDb from "./knowledge-db";
import { getUserByEmail } from "./db";
import { guardCompanyAccess, guardCompanyAdmin, guardCompanyOwner } from "./_core/tenant-guard";

const LAST_ADMIN_MESSAGE = "A empresa precisa ter pelo menos 1 administrador. Promova outro membro antes.";

/** Garante que a mudança não deixa a empresa sem administrador */
async function guardKeepsAnAdmin(companyId: number, userId: number) {
  const member = await knowledgeDb.getCompanyMember(companyId, userId);
  const isAdmin = member?.role === "admin" || member?.role === "owner";
  if (isAdmin && (await knowledgeDb.countCompanyAdmins(companyId)) <= 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: LAST_ADMIN_MESSAGE });
  }
}

async function guardNotOwner(companyId: number, userId: number, message: string) {
  const company = await knowledgeDb.getCompanyById(companyId);
  if (company?.ownerId === userId) {
    throw new TRPCError({ code: "BAD_REQUEST", message });
  }
}

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
   * Empresa ativa do usuário nesta requisição (a que vale para a base de conhecimento)
   */
  current: tenantProcedure.query(async ({ ctx }) => {
    const company = await knowledgeDb.getCompanyById(ctx.tenant.companyId);
    return company ? { id: company.id, name: company.name, slug: company.slug, role: ctx.tenant.role } : null;
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
      
      const userRole = company.ownerId === ctx.user.id ? "owner" : member.role;
      return {
        ...company,
        userRole,
        canManage: userRole === "owner" || userRole === "admin",
        isOwner: company.ownerId === ctx.user.id,
        isActive: ctx.tenant.companyId === company.id,
        stats: await knowledgeDb.getCompanyStats(company.id),
      };
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
      await guardCompanyAccess(ctx.user.id, input.companyId);
      const company = await knowledgeDb.getCompanyById(input.companyId);
      const members = await knowledgeDb.getCompanyMembers(input.companyId);
      return members.map((m) => ({ ...m, role: m.userId === company?.ownerId ? ("owner" as const) : m.role }));
    }),

  /**
   * Adiciona um funcionário pelo email (admin only). A pessoa precisa já ter conta.
   */
  inviteMember: tenantProcedure
    .input(
      z.object({
        companyId: z.number(),
        email: z.string().trim().email("Email inválido"),
        role: z.enum(['member', 'admin']).default('member'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await guardCompanyAdmin(ctx.user.id, input.companyId);

      const user = await getUserByEmail(input.email);
      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Não existe conta com esse email. Peça para a pessoa se cadastrar no Story Teller e tente de novo.",
        });
      }
      
      const existing = await knowledgeDb.getCompanyMember(input.companyId, user.id);
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este usuário já é membro da empresa",
        });
      }
      
      const memberId = await knowledgeDb.addCompanyMember({
        companyId: input.companyId,
        userId: user.id,
        role: input.role,
      });
      
      return { memberId, name: user.name, email: user.email };
    }),

  /**
   * Muda o nível de acesso de um membro (admin only). Proprietário só muda transferindo a propriedade.
   */
  updateMemberRole: tenantProcedure
    .input(
      z.object({
        companyId: z.number(),
        userId: z.number(),
        role: z.enum(['member', 'admin']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await guardCompanyAdmin(ctx.user.id, input.companyId);
      await guardNotOwner(
        input.companyId,
        input.userId,
        "O nível do proprietário não pode ser alterado. Transfira a propriedade para outro membro antes."
      );
      if (input.role === "member") await guardKeepsAnAdmin(input.companyId, input.userId);
      
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
      await guardNotOwner(input.companyId, input.userId, "Não é possível remover o proprietário da empresa");
      await guardKeepsAnAdmin(input.companyId, input.userId);
      
      await knowledgeDb.removeCompanyMember(input.companyId, input.userId);
      return { success: true };
    }),

  /**
   * Transfere a propriedade para outro membro (owner only); o antigo proprietário vira admin
   */
  transferOwnership: tenantProcedure
    .input(z.object({ companyId: z.number(), userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await guardCompanyOwner(ctx.user.id, input.companyId);
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Você já é o proprietário" });
      }
      const target = await knowledgeDb.getCompanyMember(input.companyId, input.userId);
      if (!target) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Esse usuário não é membro da empresa" });
      }
      await knowledgeDb.transferCompanyOwnership(input.companyId, ctx.user.id, input.userId);
      return { success: true };
    }),
});
