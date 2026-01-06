import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./subscriptions";
import { createCheckoutSession, createCustomerPortalSession } from "./_core/stripe";
import { getCurrentUsage, getUserSubscriptionInfo } from "./_core/subscription-guard";

/**
 * Subscription routers - gerenciamento de assinaturas e pagamentos
 */
export const subscriptionsRouter = router({
  // Get current subscription
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    return await db.getSubscriptionWithPlan(ctx.user.id);
  }),
  
  // List all available plans
  getPlans: protectedProcedure.query(async () => {
    return await db.getAllPlans();
  }),
  
  // Get current usage and limits
  getUsage: protectedProcedure.query(async ({ ctx }) => {
    return await getCurrentUsage(ctx.user.id);
  }),
  
  // Get subscription status and plan info
  getStatus: protectedProcedure.query(async ({ ctx }) => {
    return await getUserSubscriptionInfo(ctx.user.id);
  }),
  
  // Create checkout session
  createCheckout: protectedProcedure
    .input(
      z.object({
        planId: z.number(),
        billingCycle: z.enum(["monthly", "yearly"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const session = await createCheckoutSession({
        userId: ctx.user.id,
        userEmail: ctx.user.email,
        planId: input.planId,
        billingCycle: input.billingCycle,
      });
      
      return { url: session.url };
    }),
  
  // Create customer portal session
  createPortal: protectedProcedure.mutation(async ({ ctx }) => {
    const subscription = await db.getActiveSubscription(ctx.user.id);
    
    if (!subscription || !subscription.stripeCustomerId) {
      throw new Error("Você não tem uma assinatura ativa");
    }
    
    const session = await createCustomerPortalSession(subscription.stripeCustomerId);
    
    return { url: session.url };
  }),
  
  // Get payment history
  getPayments: protectedProcedure.query(async ({ ctx }) => {
    return await db.getPaymentsByUser(ctx.user.id);
  }),
});






