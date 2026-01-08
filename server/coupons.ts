/**
 * Sistema de Cupons - Database functions
 */

import { eq, and, gte, lte, or, isNull } from "drizzle-orm";
import { getDb } from "./db";
import { coupons, couponUsage, InsertCoupon, InsertCouponUsage } from "../drizzle/schema-coupons";

/**
 * Validar um cupom
 * Retorna o cupom se válido, ou null se inválido
 */
export async function validateCoupon(code: string, userId: number, planId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const now = new Date();
  
  // Buscar cupom
  const result = await db
    .select()
    .from(coupons)
    .where(
      and(
        eq(coupons.code, code.toUpperCase()),
        eq(coupons.isActive, true),
        gte(coupons.validFrom, now),
        or(
          isNull(coupons.validUntil),
          lte(now, coupons.validUntil)
        )
      )
    )
    .limit(1);
  
  if (result.length === 0) {
    return { valid: false, error: "Cupom inválido ou expirado" };
  }
  
  const coupon = result[0];
  
  // Verificar se o cupom é para um plano específico
  if (coupon.planId && planId && coupon.planId !== planId) {
    return { valid: false, error: "Cupom não é válido para este plano" };
  }
  
  // Verificar limite de uso
  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    return { valid: false, error: "Cupom esgotado" };
  }
  
  // Verificar se o usuário já usou este cupom
  const userUsage = await db
    .select()
    .from(couponUsage)
    .where(
      and(
        eq(couponUsage.couponId, coupon.id),
        eq(couponUsage.userId, userId)
      )
    )
    .limit(1);
  
  if (userUsage.length > 0) {
    return { valid: false, error: "Você já usou este cupom" };
  }
  
  return { valid: true, coupon };
}

/**
 * Aplicar cupom (registrar uso)
 */
export async function applyCoupon(
  couponId: number,
  userId: number,
  discountApplied: number,
  subscriptionId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Registrar uso
  await db.insert(couponUsage).values({
    couponId,
    userId,
    subscriptionId,
    discountApplied,
  });
  
  // Incrementar contador de uso
  await db
    .update(coupons)
    .set({
      usedCount: db.$with("current")
        .as(db.select().from(coupons).where(eq(coupons.id, couponId)))
        .$dynamic(),
    })
    .where(eq(coupons.id, couponId));
}

/**
 * Criar cupom
 */
export async function createCoupon(data: InsertCoupon) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Garantir que o código seja maiúsculo
  const couponData = {
    ...data,
    code: data.code.toUpperCase(),
  };
  
  const result = await db.insert(coupons).values(couponData).returning();
  return result[0];
}

/**
 * Listar todos os cupons (admin)
 */
export async function listCoupons() {
  const db = await getDb();
  if (!db) return [];
  
  return db.select().from(coupons).orderBy(coupons.createdAt);
}

/**
 * Buscar cupom por ID
 */
export async function getCouponById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  return result.length > 0 ? result[0] : null;
}

/**
 * Atualizar cupom
 */
export async function updateCoupon(id: number, data: Partial<InsertCoupon>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(coupons)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(coupons.id, id));
  
  return getCouponById(id);
}

/**
 * Desativar cupom
 */
export async function deactivateCoupon(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db
    .update(coupons)
    .set({ isActive: false, updatedAt: new Date() })
    .where(eq(coupons.id, id));
}

/**
 * Obter estatísticas de uso de um cupom
 */
export async function getCouponStats(couponId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const coupon = await getCouponById(couponId);
  if (!coupon) return null;
  
  const usage = await db
    .select()
    .from(couponUsage)
    .where(eq(couponUsage.couponId, couponId));
  
  const totalDiscount = usage.reduce((sum, u) => sum + u.discountApplied, 0);
  
  return {
    coupon,
    totalUses: usage.length,
    totalDiscount,
    remainingUses: coupon.maxUses ? coupon.maxUses - coupon.usedCount : null,
  };
}

/**
 * Calcular valor do desconto
 */
export function calculateDiscount(
  coupon: any,
  originalPrice: number
): number {
  switch (coupon.type) {
    case "percentage":
      return Math.floor((originalPrice * coupon.discountValue) / 100);
    
    case "fixed":
      return Math.min(coupon.discountValue, originalPrice);
    
    case "free_plan":
    case "free_trial":
      return originalPrice; // 100% de desconto
    
    default:
      return 0;
  }
}

