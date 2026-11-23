import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, tenantProcedure, router } from "./_core/trpc";
import * as knowledgeDb from "./knowledge-db";
import { getUserByEmail } from "./db";
import { guardCompanyAccess, guardCompanyAdmin, guardCompanyOwner } from "./_core/tenant-guard";
import { ENV } from "./_core/env";
import { escapeHtml, sendMail } from "./_core/mailer";

const LAST_ADMIN_MESSAGE = "A empresa precisa ter pelo menos 1 administrador. Promova outro membro antes.";

const ROLE_NAMES = { owner: "proprietário", admin: "administrador", member: "membro" } as const;

function emailLayout(paragraphs: string[], cta: { label: string; url: string }) {
  return `<div style="font-family:Arial,sans-serif;font-size:15px;color:#1f2937;max-width:520px">
${paragraphs.map((p) => `<p>${p}</p>`).join("\n")}
<p><a href="${cta.url}" style="display:inline-block;background:#0078d4;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${cta.label}</a></p>
<p style="font-size:13px;color:#6b7280">Se o botão não funcionar, copie este link: ${cta.url}</p>
</div>`;
}

async function sendInviteEmail(
  invite: { email: string; token: string; role: keyof typeof ROLE_NAMES },
  companyName: string,
  inviterName: string
) {
  const url = `${ENV.appUrl}/register?invite=${invite.token}`;
  const role = ROLE_NAMES[invite.role];
  return sendMail({
    to: invite.email,
    subject: `${inviterName} convidou você para ${companyName} no Story Teller`,
    text: `${inviterName} convidou você para entrar na empresa ${companyName} no Story Teller como ${role}.\n\nCrie sua conta com este email para entrar automaticamente: ${url}\n\nSua conta terá a sua própria assinatura (começa no plano gratuito).`,
    html: emailLayout(
      [
        `<strong>${escapeHtml(inviterName)}</strong> convidou você para entrar na empresa <strong>${escapeHtml(companyName)}</strong> no Story Teller como ${role}.`,
        `Crie sua conta com este email (${escapeHtml(invite.email)}) e você entra na empresa automaticamente.`,
        `Sua conta terá a sua própria assinatura e começa no plano gratuito.`,
      ],
      { label: "Criar minha conta", url }
    ),
  });
}

async function sendAddedEmail(email: string, companyName: string, inviterName: string) {
  const url = `${ENV.appUrl}/login`;
  return sendMail({
    to: email,
    subject: `Você agora faz parte de ${companyName} no Story Teller`,
    text: `${inviterName} adicionou você à empresa ${companyName} no Story Teller. Entre para acessar: ${url}`,
    html: emailLayout(
      [`<strong>${escapeHtml(inviterName)}</strong> adicionou você à empresa <strong>${escapeHtml(companyName)}</strong> no Story Teller.`],
      { label: "Entrar no Story Teller", url }
    ),
  });
}

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
   * Adiciona um funcionário pelo email (admin only).
   * Com conta: entra na hora e recebe um aviso. Sem conta: recebe convite para se cadastrar
   * e entra na empresa automaticamente ao criar a conta.
   */
  inviteMember: tenantProcedure
    .input(
      z.object({
        companyId: z.number(),
        email: z.string().trim().toLowerCase().email("Email inválido"),
        role: z.enum(['member', 'admin']).default('member'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await guardCompanyAdmin(ctx.user.id, input.companyId);
      const company = await knowledgeDb.getCompanyById(input.companyId);
      if (!company) throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });

      const user = await getUserByEmail(input.email);
      if (!user) {
        const invite = await knowledgeDb.upsertCompanyInvite({
          companyId: input.companyId,
          email: input.email,
          role: input.role,
          invitedBy: ctx.user.id,
        });
        const emailSent = await sendInviteEmail(invite, company.name, ctx.user.name);
        return { status: "invited" as const, email: input.email, name: null, emailSent };
      }
      
      const existing = await knowledgeDb.getCompanyMember(input.companyId, user.id);
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Este usuário já é membro da empresa",
        });
      }
      
      await knowledgeDb.addCompanyMember({
        companyId: input.companyId,
        userId: user.id,
        role: input.role,
      });
      const emailSent = await sendAddedEmail(user.email, company.name, ctx.user.name);
      
      return { status: "added" as const, email: user.email, name: user.name, emailSent };
    }),

  /** Convites ainda não aceitos (admin only) */
  listInvites: tenantProcedure
    .input(z.object({ companyId: z.number() }))
    .query(async ({ ctx, input }) => {
      await guardCompanyAdmin(ctx.user.id, input.companyId);
      return knowledgeDb.listPendingCompanyInvites(input.companyId);
    }),

  resendInvite: tenantProcedure
    .input(z.object({ companyId: z.number(), inviteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await guardCompanyAdmin(ctx.user.id, input.companyId);
      const invite = await knowledgeDb.getPendingCompanyInvite(input.companyId, input.inviteId);
      const company = await knowledgeDb.getCompanyById(input.companyId);
      if (!invite || !company) throw new TRPCError({ code: "NOT_FOUND", message: "Convite não encontrado" });
      await knowledgeDb.touchCompanyInvite(invite.id);
      return { emailSent: await sendInviteEmail(invite, company.name, ctx.user.name) };
    }),

  cancelInvite: tenantProcedure
    .input(z.object({ companyId: z.number(), inviteId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      await guardCompanyAdmin(ctx.user.id, input.companyId);
      await knowledgeDb.deleteCompanyInvite(input.companyId, input.inviteId);
      return { success: true };
    }),

  /** Dados do convite para a tela de cadastro (público: quem recebe ainda não tem conta) */
  inviteInfo: publicProcedure
    .input(z.object({ token: z.string().min(10).max(64) }))
    .query(async ({ input }) => {
      return knowledgeDb.getPendingInviteByToken(input.token);
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
