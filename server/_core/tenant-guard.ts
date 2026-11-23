/**
 * Multi-tenant isolation middleware
 * Ensures users can only access data from companies they belong to
 */

import { TRPCError } from "@trpc/server";
import { getCompanyMember, getCompanyById } from "../knowledge-db";

/** Header com a empresa escolhida no cliente (validado contra a participação do usuário) */
export const ACTIVE_COMPANY_HEADER = "x-company-id";

export function requestedCompanyId(req?: { headers?: Record<string, string | string[] | undefined> } | null): number | null {
  const header = req?.headers?.[ACTIVE_COMPANY_HEADER];
  const value = Number(Array.isArray(header) ? header[0] : header);
  return Number.isInteger(value) && value > 0 ? value : null;
}

/**
 * Empresa ativa do usuário: a pedida no header, se ele for membro;
 * senão a empresa em que ele entrou por último (um convite novo vira a empresa padrão).
 */
export async function getUserCompanyId(userId: number, requestedCompanyId?: number | null): Promise<number> {
  const { getCompaniesByUserId } = await import("../knowledge-db");
  const companies = await getCompaniesByUserId(userId);
  
  if (companies.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Usuário não pertence a nenhuma empresa. Crie ou entre em uma empresa para continuar.",
    });
  }
  
  if (requestedCompanyId && companies.some((c) => c.id === requestedCompanyId)) {
    return requestedCompanyId;
  }
  return companies[0].id;
}

/**
 * Check if user has access to a company
 */
export async function checkCompanyAccess(userId: number, companyId: number): Promise<boolean> {
  const member = await getCompanyMember(companyId, userId);
  return !!member;
}

/**
 * Check if user has admin or owner role in a company
 */
export async function checkCompanyAdmin(userId: number, companyId: number): Promise<boolean> {
  const member = await getCompanyMember(companyId, userId);
  return member?.role === 'admin' || member?.role === 'owner';
}

/**
 * Check if user is the owner of a company
 */
export async function checkCompanyOwner(userId: number, companyId: number): Promise<boolean> {
  const company = await getCompanyById(companyId);
  return company?.ownerId === userId;
}

/**
 * Guard function to ensure user has access to company
 * Throws TRPCError if access denied
 */
export async function guardCompanyAccess(userId: number, companyId: number): Promise<void> {
  const hasAccess = await checkCompanyAccess(userId, companyId);
  
  if (!hasAccess) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Você não tem permissão para acessar esta empresa.",
    });
  }
}

/**
 * Guard function to ensure user is admin or owner
 * Throws TRPCError if not authorized
 */
export async function guardCompanyAdmin(userId: number, companyId: number): Promise<void> {
  const isAdmin = await checkCompanyAdmin(userId, companyId);
  
  if (!isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas administradores ou proprietários podem realizar esta ação.",
    });
  }
}

/**
 * Guard function to ensure user is the company owner
 * Throws TRPCError if not owner
 */
export async function guardCompanyOwner(userId: number, companyId: number): Promise<void> {
  const isOwner = await checkCompanyOwner(userId, companyId);
  
  if (!isOwner) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Apenas o proprietário da empresa pode realizar esta ação.",
    });
  }
}

/**
 * Extended context with company information
 */
export interface TenantContext {
  userId: number;
  companyId: number;
  role: "owner" | "admin" | "member";
  isCompanyAdmin: boolean;
  isCompanyOwner: boolean;
}

/**
 * Get full tenant context for a user
 */
export async function getTenantContext(userId: number, requestedCompanyId?: number | null): Promise<TenantContext> {
  const activeCompanyId = await getUserCompanyId(userId, requestedCompanyId);
  
  const member = await getCompanyMember(activeCompanyId, userId);
  const isOwner = await checkCompanyOwner(userId, activeCompanyId);
  const role = isOwner ? "owner" : (member?.role ?? "member");
  
  return {
    userId,
    companyId: activeCompanyId,
    role,
    isCompanyAdmin: role === "admin" || role === "owner",
    isCompanyOwner: isOwner,
  };
}

/**
 * Pode alterar a base de conhecimento e as configurações da empresa ativa.
 * Depende só do nível na empresa: admin do sistema (users.role) não vira admin de empresa.
 */
export function canManageCompany(ctx: { tenant: TenantContext }): boolean {
  return ctx.tenant.isCompanyAdmin;
}
