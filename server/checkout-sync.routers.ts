import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { stripe } from "./_core/stripe";
import * as subscriptionDb from "./subscriptions";

/**
 * Router para sincronizar checkout do Stripe
 * Usado como fallback quando webhooks não funcionam
 */
export const checkoutSyncRouter = router({
  // Sincronizar assinatura a partir do session_id do checkout
  syncFromSession: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!stripe) {
        throw new Error("Stripe não configurado");
      }

      console.log(`[CheckoutSync] Syncing session: ${input.sessionId}`);

      try {
        // 1. Buscar sessão do Stripe
        const session = await stripe.checkout.sessions.retrieve(input.sessionId, {
          expand: ['subscription', 'customer'],
        });

        console.log(`[CheckoutSync] Session retrieved:`, {
          id: session.id,
          status: session.payment_status,
          subscription: session.subscription,
        });

        if (session.payment_status !== 'paid') {
          throw new Error('Pagamento ainda não foi confirmado');
        }

        if (!session.subscription) {
          throw new Error('Nenhuma assinatura encontrada na sessão');
        }

        // 2. Buscar subscription do Stripe
        const stripeSubscription = typeof session.subscription === 'string'
          ? await stripe.subscriptions.retrieve(session.subscription)
          : session.subscription;

        console.log(`[CheckoutSync] Stripe subscription:`, {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          customer: stripeSubscription.customer,
        });

        // 3. Extrair metadados
        const userId = parseInt(session.metadata?.userId || ctx.user.id.toString());
        const planId = parseInt(session.metadata?.planId || "0");
        const billingCycle = session.metadata?.billingCycle as "monthly" | "yearly";

        if (!planId) {
          throw new Error('Plan ID não encontrado nos metadados');
        }

        console.log(`[CheckoutSync] Metadata:`, {
          userId,
          planId,
          billingCycle,
        });

        // 4. Verificar se já existe assinatura
        const existingSub = await subscriptionDb.getSubscriptionByStripeId(stripeSubscription.id);

        if (existingSub) {
          console.log(`[CheckoutSync] Subscription already exists: ${existingSub.id}`);
          return {
            success: true,
            message: 'Assinatura já existe',
            subscriptionId: existingSub.id,
          };
        }

        // 5. Cancelar assinaturas antigas do usuário
        const { getDb } = await import('./db');
        const db = await getDb();
        if (db) {
          const { eq } = await import('drizzle-orm');
          const { subscriptions } = await import('../drizzle/schema');
          await db
            .update(subscriptions)
            .set({ status: 'canceled', updatedAt: new Date() })
            .where(eq(subscriptions.userId, userId));
        }

        // 6. Criar nova assinatura no banco
        const newSubscription = await subscriptionDb.createSubscription({
          userId,
          planId,
          status: stripeSubscription.status === "trialing" ? "trialing" : "active",
          billingCycle,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          stripeSubscriptionId: stripeSubscription.id,
          stripeCustomerId: stripeSubscription.customer as string,
          cancelAtPeriodEnd: false,
          tokensUsedThisPeriod: 0,
        });

        console.log(`[CheckoutSync] ✅ Subscription created successfully: ${newSubscription.id}`);

        return {
          success: true,
          message: 'Assinatura sincronizada com sucesso',
          subscriptionId: newSubscription.id,
        };

      } catch (error: any) {
        console.error(`[CheckoutSync] ❌ Error:`, error.message);
        console.error(error.stack);
        throw new Error(`Erro ao sincronizar assinatura: ${error.message}`);
      }
    }),
});

