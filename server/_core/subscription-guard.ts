import { TRPCError } from "@trpc/server";
import * as subscriptionDb from "../subscriptions";
import * as db from "../db";
import { getCompanyUserIds } from "../knowledge-db";
import {
  entitlementToStatus,
  FREE_TOKENS_LIMIT,
  resolveEntitlement,
  tokenLimitFor,
  tokenPeriodStart,
  type Entitlement,
  type EntitlementLoader,
} from "./entitlements";
import { getUserCompanyId, requestedCompanyId } from "./tenant-guard";

export class SubscriptionError extends TRPCError {
  constructor(message: string, public limitType: string, public planName: string) {
    super({
      code: "FORBIDDEN",
      message,
    });
  }
}

const dbLoader: EntitlementLoader = {
  getCompanyUserIds,
  getAdminUserIds: subscriptionDb.getAdminUserIds,
  getEntitledSubscriptions: subscriptionDb.getEntitledSubscriptionsWithPlan,
  getTopPlan: subscriptionDb.getTopPlan,
};

/**
 * Empresa em contexto para checar plano: a do header x-company-id (se o usuário for membro)
 * ou a empresa padrão dele. null quando o usuário não tem empresa (vale só o plano dele).
 */
export async function getRequestCompanyId(
  userId: number,
  req?: { headers?: Record<string, string | string[] | undefined> } | null,
): Promise<number | null> {
  try {
    return await getUserCompanyId(userId, requestedCompanyId(req));
  } catch {
    return null;
  }
}

/**
 * Plano efetivo: o melhor entre o do usuário e o de qualquer usuário da empresa em contexto.
 * Admin do sistema (users.role = 'admin') vale sempre como Business.
 */
export async function getEffectiveEntitlement(userId: number, companyId: number | null = null): Promise<Entitlement> {
  return resolveEntitlement(dbLoader, { id: userId }, companyId);
}

// Check if user can create a feature (all plans now have unlimited features)
export async function checkFeatureLimit(_userId: number) {
  return true;
}

// Check if user can use tokens (limite do plano efetivo; consumo contado por usuário)
export async function checkTokenLimit(userId: number, tokensToUse: number, companyId: number | null = null) {
  const ent = await getEffectiveEntitlement(userId, companyId);
  const limit = tokenLimitFor(ent);
  if (limit === null) return true;

  const used = await db.getTokenUsageSinceDate(userId, tokenPeriodStart(ent));
  if (used + tokensToUse <= limit) return true;

  if (!ent.plan) {
    throw new SubscriptionError(
      `Você está próximo ou atingiu o limite de ${FREE_TOKENS_LIMIT.toLocaleString()} tokens do plano gratuito. Faça upgrade para continuar!`,
      "tokens",
      "free"
    );
  }

  throw new SubscriptionError(
    `Você atingiu o limite de ${limit.toLocaleString()} tokens do plano ${ent.plan.displayName}. ` +
      (ent.plan.name === "pro"
        ? "Faça upgrade para o plano Business para ter 2M de tokens!"
        : "Entre em contato para aumentar seu limite."),
    "tokens",
    ent.plan.name
  );
}

// Get current usage and limits (plano efetivo)
export async function getCurrentUsage(userId: number, companyId: number | null = null) {
  const ent = await getEffectiveEntitlement(userId, companyId);
  const limit = tokenLimitFor(ent);
  const used = await db.getTokenUsageSinceDate(userId, tokenPeriodStart(ent));

  return {
    plan: ent.plan
      ? { name: ent.plan.name, displayName: ent.plan.displayName }
      : { name: "free", displayName: "Gratuito" },
    entitlementSource: ent.source,
    features: {
      used: ent.plan ? ("unlimited" as const) : await subscriptionDb.countFeaturesThisMonth(userId),
      limit: null, // Unlimited features
      percentage: 0,
    },
    tokens: {
      used,
      limit,
      percentage: limit ? (used / limit) * 100 : 0,
    },
  };
}

// Check if user has paid plan (Pro or Business), considerando a empresa em contexto
export async function hasPaidPlan(userId: number, companyId: number | null = null): Promise<boolean> {
  const ent = await getEffectiveEntitlement(userId, companyId);
  return entitlementToStatus(ent).hasPaidPlan;
}

// Get user's subscription status and plan info (plano efetivo na empresa em contexto)
export async function getUserSubscriptionInfo(userId: number, companyId: number | null = null) {
  const ent = await getEffectiveEntitlement(userId, companyId);
  return entitlementToStatus(ent);
}
