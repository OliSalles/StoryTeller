import { eq, and, or, desc, gte, inArray } from "drizzle-orm";
import {
  subscriptionPlans,
  subscriptions,
  payments,
  features,
  users,
  InsertSubscription,
  InsertPayment,
} from "../drizzle/schema";
import { getDb } from "./db";

// ============ SUBSCRIPTION PLANS ============

export async function getAllPlans() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(subscriptionPlans).where(eq(subscriptionPlans.isActive, true));
}

export async function getPlanById(planId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.id, planId)).limit(1);
  return result[0] || null;
}

export async function getPlanByName(name: string) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(subscriptionPlans).where(eq(subscriptionPlans.name, name)).limit(1);
  return result[0] || null;
}

// ============ SUBSCRIPTIONS ============

/** Assinaturas ativas ou em trial dos usuários informados, com o plano (para o plano efetivo da empresa) */
export async function getEntitledSubscriptionsWithPlan(userIds: number[]) {
  const db = await getDb();
  if (!db || userIds.length === 0) return [];

  return db
    .select({
      subscription: subscriptions,
      plan: subscriptionPlans,
    })
    .from(subscriptions)
    .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(
      and(
        inArray(subscriptions.userId, userIds),
        or(eq(subscriptions.status, "active"), eq(subscriptions.status, "trialing"))
      )
    )
    .orderBy(desc(subscriptions.createdAt));
}

/** Dos usuários informados, os que são admin do sistema (users.role = 'admin') */
export async function getAdminUserIds(userIds: number[]): Promise<number[]> {
  const db = await getDb();
  if (!db || userIds.length === 0) return [];

  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, userIds), eq(users.role, "admin")));
  return rows.map((r) => r.id);
}

/** Plano mais alto ativo: o Business; se não existir, o de maior preço mensal */
export async function getTopPlan() {
  const byName = await getPlanByName("business");
  if (byName && byName.isActive !== false) return byName;
  const plans = await getAllPlans();
  return plans.sort((a, b) => (b.priceMonthly ?? 0) - (a.priceMonthly ?? 0))[0] ?? null;
}

export async function getActiveSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        or(
          eq(subscriptions.status, "active"),
          eq(subscriptions.status, "trialing")
        )
      )
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  
  return result[0] || null;
}

export async function getSubscriptionWithPlan(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select({
      subscription: subscriptions,
      plan: subscriptionPlans,
    })
    .from(subscriptions)
    .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  
  return result[0] || null;
}

export async function createSubscription(data: InsertSubscription) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(subscriptions).values(data);
  const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, data.userId)).orderBy(desc(subscriptions.id)).limit(1);
  return result[0];
}

export async function updateSubscription(subscriptionId: number, data: Partial<InsertSubscription>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(subscriptions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(subscriptions.id, subscriptionId));
}

export async function updateSubscriptionByStripeId(stripeSubscriptionId: string, data: Partial<InsertSubscription>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(subscriptions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
}

export async function cancelSubscription(subscriptionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(subscriptions)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(eq(subscriptions.id, subscriptionId));
}

// ============ USAGE TRACKING ============

export async function incrementTokenUsage(userId: number, tokens: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const subscription = await getActiveSubscription(userId);
  if (!subscription) return; // Free plan, no tracking needed
  
  await db
    .update(subscriptions)
    .set({
      tokensUsedThisPeriod: (subscription.tokensUsedThisPeriod ?? 0) + tokens,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));
}

export async function resetPeriodUsage(subscriptionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(subscriptions)
    .set({
      tokensUsedThisPeriod: 0,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscriptionId));
}

// Count features created this month (for Free plan)
export async function countFeaturesThisMonth(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const result = await db
    .select()
    .from(features)
    .where(
      and(
        eq(features.userId, userId),
        gte(features.createdAt, startOfMonth)
      )
    );
  
  return result.length;
}

// ============ PAYMENTS ============

export async function createPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.insert(payments).values(data);
}

export async function getPaymentsBySubscription(subscriptionId: number) {
  const db = await getDb();
  if (!db) return [];
  
  return db
    .select()
    .from(payments)
    .where(eq(payments.subscriptionId, subscriptionId))
    .orderBy(desc(payments.createdAt));
}

export async function getPaymentsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  
  const result = await db
    .select({
      payment: payments,
      subscription: subscriptions,
      plan: subscriptionPlans,
    })
    .from(payments)
    .leftJoin(subscriptions, eq(payments.subscriptionId, subscriptions.id))
    .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(eq(subscriptions.userId, userId))
    .orderBy(desc(payments.createdAt));
  
  return result;
}

// ============ SUBSCRIPTION BY STRIPE ID ============

export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId))
    .limit(1);
  
  return result[0] || null;
}







