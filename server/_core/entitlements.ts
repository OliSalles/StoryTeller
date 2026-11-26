/**
 * Plano efetivo (entitlements).
 *
 * Regras:
 * 1. Usuário com role "admin" (admin do sistema) recebe sempre o plano mais alto (Business), sem pagar
 *    e sem depender de linha manual em `subscriptions`.
 * 2. Só assinaturas com status "active" ou "trialing" liberam recursos pagos.
 * 3. Com empresa em contexto, a empresa tem acesso a um recurso pago se PELO MENOS UM usuário ligado a ela
 *    (dono ou membro) tiver licença que libere esse recurso. O plano efetivo é o melhor plano entre
 *    todos esses usuários.
 * 4. Sem empresa em contexto, vale só o plano do próprio usuário.
 */
import type { Subscription, SubscriptionPlan } from "../../drizzle/schema";

export const TOP_PLAN_NAME = "business";
export const FREE_TOKENS_LIMIT = 50000;
export const ENTITLED_STATUSES = ["active", "trialing"] as const;

export type EntitlementPlan = Pick<
  SubscriptionPlan,
  | "id"
  | "name"
  | "displayName"
  | "priceMonthly"
  | "tokensLimit"
  | "canExportJira"
  | "canExportAzure"
  | "hasApiAccess"
  | "hasPrioritySupport"
>;

/** Usado quando o plano Business não existe na tabela (ex.: banco local sem seed) */
export const FALLBACK_TOP_PLAN: EntitlementPlan = {
  id: 0,
  name: TOP_PLAN_NAME,
  displayName: "Business",
  priceMonthly: 14900,
  tokensLimit: 2000000,
  canExportJira: true,
  canExportAzure: true,
  hasApiAccess: true,
  hasPrioritySupport: true,
};

export type EntitlementSource = "free" | "own" | "company" | "admin";

export type Entitlement = {
  /** null = plano gratuito */
  plan: EntitlementPlan | null;
  /** Assinatura que libera o plano (pode ser de outro usuário da empresa); null para free ou admin */
  subscription: Subscription | null;
  /** De onde vem o plano: próprio, outro usuário da empresa, admin do sistema ou gratuito */
  source: EntitlementSource;
  /** Usuário cuja licença libera o plano (null no gratuito) */
  grantedByUserId: number | null;
  /** Empresa usada no cálculo (null = sem contexto de empresa) */
  companyId: number | null;
};

export type SubscriptionWithPlan = { subscription: Subscription; plan: EntitlementPlan | null };

/** Acesso a dados; separado para facilitar testes */
export interface EntitlementLoader {
  /** Dono + membros da empresa */
  getCompanyUserIds(companyId: number): Promise<number[]>;
  /** Dos ids informados, quais têm users.role = 'admin' */
  getAdminUserIds(userIds: number[]): Promise<number[]>;
  /** Assinaturas com status active/trialing desses usuários, com o plano */
  getEntitledSubscriptions(userIds: number[]): Promise<SubscriptionWithPlan[]>;
  /** Plano mais alto cadastrado (Business) */
  getTopPlan(): Promise<EntitlementPlan | null>;
}

export function isEntitledStatus(status: string | null | undefined): boolean {
  return !!status && (ENTITLED_STATUSES as readonly string[]).includes(status);
}

const NAME_RANK: Record<string, number> = { free: 0, pro: 1, business: 2 };

/** Ordena planos: preço mensal maior primeiro; empate pelo nome conhecido (business > pro > free) */
export function comparePlans(a: EntitlementPlan | null, b: EntitlementPlan | null): number {
  const priceA = a ? a.priceMonthly ?? 0 : -1;
  const priceB = b ? b.priceMonthly ?? 0 : -1;
  if (priceA !== priceB) return priceA - priceB;
  const rankA = a ? NAME_RANK[a.name] ?? 0 : -1;
  const rankB = b ? NAME_RANK[b.name] ?? 0 : -1;
  return rankA - rankB;
}

/** Melhor entitlement da lista; em empate prefere o do próprio usuário */
export function pickBestEntitlement(candidates: Entitlement[], selfUserId: number): Entitlement | null {
  let best: Entitlement | null = null;
  for (const c of candidates) {
    if (!c.plan) continue;
    if (!best) {
      best = c;
      continue;
    }
    const cmp = comparePlans(c.plan, best.plan);
    if (cmp > 0 || (cmp === 0 && c.grantedByUserId === selfUserId && best.grantedByUserId !== selfUserId)) {
      best = c;
    }
  }
  return best;
}

export async function resolveEntitlement(
  loader: EntitlementLoader,
  user: { id: number; role?: string | null },
  companyId: number | null,
): Promise<Entitlement> {
  const userIds = new Set<number>([user.id]);
  if (companyId) {
    for (const id of await loader.getCompanyUserIds(companyId)) userIds.add(id);
  }
  const ids = Array.from(userIds);

  const candidates: Entitlement[] = [];

  const adminIds = new Set(await loader.getAdminUserIds(ids));
  if (user.role === "admin") adminIds.add(user.id);
  if (adminIds.size > 0) {
    const topPlan = (await loader.getTopPlan()) ?? FALLBACK_TOP_PLAN;
    for (const adminId of Array.from(adminIds)) {
      candidates.push({
        plan: topPlan,
        subscription: null,
        source: adminId === user.id ? "admin" : "company",
        grantedByUserId: adminId,
        companyId,
      });
    }
  }

  for (const row of await loader.getEntitledSubscriptions(ids)) {
    if (!row.plan || !isEntitledStatus(row.subscription.status)) continue;
    candidates.push({
      plan: row.plan,
      subscription: row.subscription,
      source: row.subscription.userId === user.id ? "own" : "company",
      grantedByUserId: row.subscription.userId,
      companyId,
    });
  }

  return (
    pickBestEntitlement(candidates, user.id) ?? {
      plan: null,
      subscription: null,
      source: "free",
      grantedByUserId: null,
      companyId,
    }
  );
}

export function isPaidPlanName(name: string | null | undefined): boolean {
  return !!name && name !== "free";
}

/** Formato devolvido por subscriptions.getStatus */
export function entitlementToStatus(ent: Entitlement) {
  const plan = ent.plan;
  if (!plan) {
    return {
      hasPaidPlan: false,
      planName: "free",
      planDisplayName: "Gratuito",
      status: null as string | null,
      canExportJira: false,
      canExportAzure: false,
      hasApiAccess: false,
      hasPrioritySupport: false,
      entitlementSource: ent.source,
      companyId: ent.companyId,
      currentPeriodEnd: null as Date | null,
      cancelAtPeriodEnd: null as boolean | null,
    };
  }
  return {
    hasPaidPlan: isPaidPlanName(plan.name),
    planName: plan.name,
    planDisplayName: plan.displayName,
    status: (ent.subscription?.status ?? "active") as string | null,
    canExportJira: !!plan.canExportJira,
    canExportAzure: !!plan.canExportAzure,
    hasApiAccess: !!plan.hasApiAccess,
    hasPrioritySupport: !!plan.hasPrioritySupport,
    entitlementSource: ent.source,
    companyId: ent.companyId,
    // Só expõe dados de cobrança quando a assinatura é do próprio usuário
    currentPeriodEnd: ent.source === "own" ? ent.subscription?.currentPeriodEnd ?? null : null,
    cancelAtPeriodEnd: ent.source === "own" ? ent.subscription?.cancelAtPeriodEnd ?? null : null,
  };
}

/** Início do período usado para contar tokens: o da própria assinatura; senão o início do mês corrente */
export function tokenPeriodStart(ent: Entitlement, now: Date = new Date()): Date {
  if (ent.source === "own" && ent.subscription?.currentPeriodStart) {
    return new Date(ent.subscription.currentPeriodStart);
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export function tokenLimitFor(ent: Entitlement): number | null {
  if (!ent.plan) return FREE_TOKENS_LIMIT;
  return ent.plan.tokensLimit ?? null;
}
