/**
 * Multi-tenant isolation middleware
 * Ensures users can only access data from companies they belong to
 */

import { TRPCError } from "@trpc/server";
import { getCompanyMember, getCompanyById } from "../knowledge-db";

/**
 * Get user's active company ID from context or session
 * For now, we'll use the first company the user belongs to
 * In the future, this could be stored in session/cookie for multi-company switching
 */
export async function getUserCompanyId(userId: number): Promise<number> {
  const { getCompaniesByUserId } = await import("../knowledge-db");
  const companies = await getCompaniesByUserId(userId);
  
  if (companies.length === 0) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Usuário não pertence a nenhuma empresa. Crie ou entre em uma empresa para continuar.",
    });
  }
  
  // For now, return the first company
  // TODO: Store selected company in session/cookie
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
  isCompanyAdmin: boolean;
  isCompanyOwner: boolean;
}

/**
 * Get full tenant context for a user
 */
export async function getTenantContext(userId: number, companyId?: number): Promise<TenantContext> {
  const activeCompanyId = companyId || await getUserCompanyId(userId);
  
  const isAdmin = await checkCompanyAdmin(userId, activeCompanyId);
  const isOwner = await checkCompanyOwner(userId, activeCompanyId);
  
  return {
    userId,
    companyId: activeCompanyId,
    isCompanyAdmin: isAdmin,
    isCompanyOwner: isOwner,
  };
}
