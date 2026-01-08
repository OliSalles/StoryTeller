/**
 * Rotas da API de Cupons
 */

import { z } from "zod";
import { router, publicProcedure, protectedProcedure, adminProcedure } from "./_core/trpc";
import * as couponsDb from "./coupons";
import { stripe } from "./_core/stripe";

export const couponsRouter = router({
  /**
   * Validar cupom (público - qualquer usuário pode validar antes de comprar)
   */
  validate: publicProcedure
    .input(
      z.object({
        code: z.string().min(1),
        planId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.userId || 0;
      
      const result = await couponsDb.validateCoupon(
        input.code,
        userId,
        input.planId
      );
      
      if (!result.valid) {
        throw new Error(result.error);
      }
      
      const coupon = result.coupon!;
      
      // Calcular desconto estimado (baseado no plano se fornecido)
      let discountPreview = null;
      if (input.planId) {
        // TODO: Buscar preço do plano e calcular desconto real
        discountPreview = {
          type: coupon.type,
          value: coupon.discountValue,
        };
      }
      
      return {
        valid: true,
        coupon: {
          id: coupon.id,
          code: coupon.code,
          type: coupon.type,
          description: coupon.description,
          discountValue: coupon.discountValue,
        },
        discountPreview,
      };
    }),

  /**
   * Aplicar cupom no checkout
   * Usado internamente ao criar assinatura
   */
  applyCoupon: protectedProcedure
    .input(
      z.object({
        couponId: z.number(),
        subscriptionId: z.number().optional(),
        discountApplied: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await couponsDb.applyCoupon(
        input.couponId,
        ctx.user.userId,
        input.discountApplied,
        input.subscriptionId
      );
      
      return { success: true };
    }),

  /**
   * Criar cupom (admin apenas)
   */
  create: adminProcedure
    .input(
      z.object({
        code: z.string().min(1).max(64),
        type: z.enum(["percentage", "fixed", "free_trial", "free_plan"]),
        discountValue: z.number().optional(),
        planId: z.number().optional(),
        maxUses: z.number().optional(),
        validUntil: z.date().optional(),
        description: z.string().max(512).optional(),
        
        // Opções para Stripe
        createInStripe: z.boolean().default(false),
        durationStripe: z.enum(["once", "repeating", "forever"]).default("once"),
        durationMonths: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let stripeCouponId: string | undefined;
      
      // Criar no Stripe se solicitado
      if (input.createInStripe && stripe) {
        try {
          const stripeCoupon = await stripe.coupons.create({
            id: input.code.toUpperCase(),
            percent_off: input.type === "percentage" ? input.discountValue : undefined,
            amount_off: input.type === "fixed" ? input.discountValue : undefined,
            currency: input.type === "fixed" ? "brl" : undefined,
            duration: input.durationStripe as any,
            duration_in_months: input.durationStripe === "repeating" ? input.durationMonths : undefined,
            max_redemptions: input.maxUses,
            redeem_by: input.validUntil ? Math.floor(input.validUntil.getTime() / 1000) : undefined,
          });
          stripeCouponId = stripeCoupon.id;
        } catch (error: any) {
          console.error("[Coupons] Error creating coupon in Stripe:", error);
          throw new Error(`Erro ao criar cupom no Stripe: ${error.message}`);
        }
      }
      
      // Criar no banco
      const coupon = await couponsDb.createCoupon({
        code: input.code,
        type: input.type,
        discountValue: input.discountValue,
        planId: input.planId,
        maxUses: input.maxUses,
        validUntil: input.validUntil,
        description: input.description,
        stripeCouponId,
        durationStripe: input.durationStripe,
        durationMonths: input.durationMonths,
        createdBy: ctx.user.userId,
      });
      
      return coupon;
    }),

  /**
   * Listar cupons (admin apenas)
   */
  list: adminProcedure.query(async () => {
    const coupons = await couponsDb.listCoupons();
    return coupons;
  }),

  /**
   * Obter estatísticas de um cupom (admin apenas)
   */
  stats: adminProcedure
    .input(z.object({ couponId: z.number() }))
    .query(async ({ input }) => {
      const stats = await couponsDb.getCouponStats(input.couponId);
      if (!stats) {
        throw new Error("Cupom não encontrado");
      }
      return stats;
    }),

  /**
   * Atualizar cupom (admin apenas)
   */
  update: adminProcedure
    .input(
      z.object({
        id: z.number(),
        isActive: z.boolean().optional(),
        maxUses: z.number().optional(),
        validUntil: z.date().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      const coupon = await couponsDb.updateCoupon(id, data);
      return coupon;
    }),

  /**
   * Desativar cupom (admin apenas)
   */
  deactivate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await couponsDb.deactivateCoupon(input.id);
      return { success: true };
    }),
});

