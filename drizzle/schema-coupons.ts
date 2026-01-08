import { pgTable, serial, varchar, integer, timestamp, boolean, pgEnum } from "drizzle-orm/pg-core";

/**
 * Sistema de Cupons
 * Permite criar cupons de desconto ou acesso gratuito aos planos
 */

export const couponTypeEnum = pgEnum("coupon_type", [
  "percentage", // Desconto em porcentagem (ex: 20% off)
  "fixed", // Desconto em valor fixo (ex: R$ 10 off)
  "free_trial", // Trial estendido (ex: 30 dias grátis)
  "free_plan", // Plano gratuito permanente
]);

export const coupons = pgTable("coupons", {
  id: serial("id").primaryKey(),
  
  // Código do cupom (ex: "PROMO2024", "BLACKFRIDAY")
  code: varchar("code", { length: 64 }).notNull().unique(),
  
  // Tipo do cupom
  type: couponTypeEnum("type").notNull(),
  
  // Valor do desconto
  // Se type = "percentage": valor de 0-100 (ex: 20 = 20% off)
  // Se type = "fixed": valor em centavos (ex: 1000 = R$ 10 off)
  // Se type = "free_trial": número de dias extras de trial
  // Se type = "free_plan": null (não usado)
  discountValue: integer("discount_value"),
  
  // Plano específico que o cupom se aplica (NULL = todos os planos)
  planId: integer("plan_id"),
  
  // Duração do desconto (apenas para Stripe)
  // "once" = aplica uma vez
  // "repeating" = aplica por N meses
  // "forever" = aplica para sempre
  durationStripe: varchar("duration_stripe", { length: 32 }).default("once"),
  
  // Se duration = "repeating", quantos meses aplicar
  durationMonths: integer("duration_months"),
  
  // Limites de uso
  maxUses: integer("max_uses"), // NULL = ilimitado
  usedCount: integer("used_count").default(0).notNull(),
  
  // Validade
  validFrom: timestamp("valid_from").defaultNow().notNull(),
  validUntil: timestamp("valid_until"), // NULL = sem expiração
  
  // Status
  isActive: boolean("is_active").default(true).notNull(),
  
  // Stripe coupon ID (se criado no Stripe)
  stripeCouponId: varchar("stripe_coupon_id", { length: 255 }),
  
  // Metadados
  description: varchar("description", { length: 512 }),
  createdBy: integer("created_by"), // ID do admin que criou
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

/**
 * Histórico de uso de cupons
 * Registra cada vez que um cupom é usado
 */
export const couponUsage = pgTable("coupon_usage", {
  id: serial("id").primaryKey(),
  couponId: integer("coupon_id").notNull(),
  userId: integer("user_id").notNull(),
  subscriptionId: integer("subscription_id"), // NULL se ainda não criou subscription
  
  // Valor do desconto aplicado (em centavos)
  discountApplied: integer("discount_applied").notNull(),
  
  usedAt: timestamp("used_at").defaultNow().notNull(),
});

export type CouponUsage = typeof couponUsage.$inferSelect;
export type InsertCouponUsage = typeof couponUsage.$inferInsert;

