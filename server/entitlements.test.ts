import { describe, it, expect } from "vitest";
import {
  comparePlans,
  entitlementToStatus,
  FALLBACK_TOP_PLAN,
  FREE_TOKENS_LIMIT,
  resolveEntitlement,
  tokenLimitFor,
  tokenPeriodStart,
  type EntitlementLoader,
  type EntitlementPlan,
  type SubscriptionWithPlan,
} from "./_core/entitlements";
import type { Subscription } from "../drizzle/schema";

const pro: EntitlementPlan = {
  id: 2,
  name: "pro",
  displayName: "Pro",
  priceMonthly: 4900,
  tokensLimit: 500000,
  canExportJira: true,
  canExportAzure: true,
  hasApiAccess: false,
  hasPrioritySupport: false,
};
const business: EntitlementPlan = {
  id: 3,
  name: "business",
  displayName: "Business",
  priceMonthly: 14900,
  tokensLimit: 2000000,
  canExportJira: true,
  canExportAzure: true,
  hasApiAccess: true,
  hasPrioritySupport: true,
};

function sub(userId: number, plan: EntitlementPlan, status: Subscription["status"] = "active"): SubscriptionWithPlan {
  return {
    plan,
    subscription: {
      id: userId * 10,
      userId,
      planId: plan.id,
      status,
      billingCycle: "monthly",
      currentPeriodStart: new Date("2026-11-10T00:00:00Z"),
      currentPeriodEnd: new Date("2026-12-10T00:00:00Z"),
      cancelAtPeriodEnd: false,
      stripeSubscriptionId: null,
      stripeCustomerId: null,
      tokensUsedThisPeriod: 0,
      createdAt: new Date("2026-11-10T00:00:00Z"),
      updatedAt: new Date("2026-11-10T00:00:00Z"),
    },
  };
}

function loader(opts: {
  companies?: Record<number, number[]>;
  admins?: number[];
  subs?: SubscriptionWithPlan[];
  topPlan?: EntitlementPlan | null;
}): EntitlementLoader {
  return {
    getCompanyUserIds: async (companyId) => opts.companies?.[companyId] ?? [],
    getAdminUserIds: async (ids) => (opts.admins ?? []).filter((id) => ids.includes(id)),
    // O loader real já filtra active/trialing; aqui devolvemos tudo para testar o filtro do resolve
    getEntitledSubscriptions: async (ids) => (opts.subs ?? []).filter((s) => ids.includes(s.subscription.userId)),
    getTopPlan: async () => (opts.topPlan === undefined ? business : opts.topPlan),
  };
}

describe("entitlements", () => {
  it("usuario sem assinatura e sem empresa fica no gratuito", async () => {
    const ent = await resolveEntitlement(loader({}), { id: 1 }, null);
    expect(ent.source).toBe("free");
    const status = entitlementToStatus(ent);
    expect(status.canExportAzure).toBe(false);
    expect(status.planName).toBe("free");
    expect(tokenLimitFor(ent)).toBe(FREE_TOKENS_LIMIT);
  });

  it("sem empresa em contexto vale so o plano do proprio usuario", async () => {
    const l = loader({ companies: { 7: [1, 2] }, subs: [sub(2, business)] });
    const ent = await resolveEntitlement(l, { id: 1 }, null);
    expect(ent.source).toBe("free");
  });

  it("empresa libera recurso pago se pelo menos um usuario tiver licenca ativa", async () => {
    const l = loader({ companies: { 7: [1, 2, 3] }, subs: [sub(3, pro)] });
    const ent = await resolveEntitlement(l, { id: 1 }, 7);
    expect(ent.source).toBe("company");
    expect(ent.grantedByUserId).toBe(3);
    const status = entitlementToStatus(ent);
    expect(status.canExportAzure).toBe(true);
    expect(status.canExportJira).toBe(true);
    expect(status.planName).toBe("pro");
    // Dados de cobrança de outro usuário não vazam
    expect(status.currentPeriodEnd).toBeNull();
  });

  it("plano efetivo e o melhor entre os usuarios da empresa", async () => {
    const l = loader({ companies: { 7: [1, 2, 3] }, subs: [sub(1, pro), sub(2, business)] });
    const ent = await resolveEntitlement(l, { id: 1 }, 7);
    expect(ent.plan?.name).toBe("business");
    expect(ent.source).toBe("company");
    expect(entitlementToStatus(ent).hasApiAccess).toBe(true);
  });

  it("em empate prefere a assinatura do proprio usuario", async () => {
    const l = loader({ companies: { 7: [1, 2] }, subs: [sub(2, pro), sub(1, pro)] });
    const ent = await resolveEntitlement(l, { id: 1 }, 7);
    expect(ent.source).toBe("own");
    expect(ent.grantedByUserId).toBe(1);
  });

  it("assinatura cancelada ou vencida nao libera nada", async () => {
    const l = loader({ companies: { 7: [1, 2] }, subs: [sub(2, business, "canceled"), sub(1, pro, "past_due")] });
    const ent = await resolveEntitlement(l, { id: 1 }, 7);
    expect(ent.source).toBe("free");
    expect(entitlementToStatus(ent).canExportAzure).toBe(false);
  });

  it("trial conta como licenca ativa", async () => {
    const l = loader({ subs: [sub(1, pro, "trialing")] });
    const ent = await resolveEntitlement(l, { id: 1 }, null);
    expect(ent.source).toBe("own");
    expect(entitlementToStatus(ent).canExportAzure).toBe(true);
  });

  it("admin do sistema recebe Business sem assinatura", async () => {
    const ent = await resolveEntitlement(loader({ admins: [1] }), { id: 1 }, null);
    expect(ent.source).toBe("admin");
    expect(ent.plan?.name).toBe("business");
    const status = entitlementToStatus(ent);
    expect(status.hasPaidPlan).toBe(true);
    expect(status.canExportAzure).toBe(true);
    expect(status.status).toBe("active");
  });

  it("admin na empresa libera Business para os outros membros", async () => {
    const l = loader({ companies: { 4: [1, 9] }, admins: [1] });
    const ent = await resolveEntitlement(l, { id: 9 }, 4);
    expect(ent.source).toBe("company");
    expect(ent.grantedByUserId).toBe(1);
    expect(entitlementToStatus(ent).canExportAzure).toBe(true);
  });

  it("dono da empresa conta mesmo sem linha em company_members", async () => {
    // getCompanyUserIds real inclui companies.owner_id; aqui simulamos o dono (5) na lista
    const l = loader({ companies: { 4: [5, 9] }, subs: [sub(5, business)] });
    const ent = await resolveEntitlement(l, { id: 9 }, 4);
    expect(ent.plan?.name).toBe("business");
  });

  it("admin usa plano de reserva quando Business nao existe no banco", async () => {
    const ent = await resolveEntitlement(loader({ admins: [1], topPlan: null }), { id: 1 }, null);
    expect(ent.plan).toEqual(FALLBACK_TOP_PLAN);
  });

  it("admin vale como Business mesmo com Pro pago", async () => {
    const ent = await resolveEntitlement(loader({ admins: [1], subs: [sub(1, pro)] }), { id: 1 }, null);
    expect(ent.plan?.name).toBe("business");
    expect(ent.source).toBe("admin");
  });

  it("comparePlans ordena business > pro > free", () => {
    expect(comparePlans(business, pro)).toBeGreaterThan(0);
    expect(comparePlans(pro, null)).toBeGreaterThan(0);
    expect(comparePlans(null, business)).toBeLessThan(0);
  });

  it("periodo de tokens: assinatura propria usa o inicio do periodo, senao o inicio do mes", async () => {
    const own = await resolveEntitlement(loader({ subs: [sub(1, pro)] }), { id: 1 }, null);
    expect(tokenPeriodStart(own).toISOString()).toBe("2026-11-10T00:00:00.000Z");

    const company = await resolveEntitlement(loader({ companies: { 7: [1, 2] }, subs: [sub(2, pro)] }), { id: 1 }, 7);
    const start = tokenPeriodStart(company, new Date(2026, 10, 26, 15, 0, 0));
    expect(start.getDate()).toBe(1);
    expect(start.getMonth()).toBe(10);
    expect(tokenLimitFor(company)).toBe(500000);
  });
});
