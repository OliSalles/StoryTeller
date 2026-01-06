# 💻 Exemplos de Código - Sistema de Assinaturas

## 🗄️ 1. Schema Drizzle (TypeScript)

```typescript
// drizzle/schema.ts

export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "canceled",
  "past_due",
  "trialing",
  "incomplete"
]);

export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "yearly"]);

export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 64 }).notNull().unique(), // 'free', 'pro', 'business'
  displayName: varchar("display_name", { length: 128 }).notNull(),
  priceMonthly: decimal("price_monthly", { precision: 10, scale: 2 }),
  priceYearly: decimal("price_yearly", { precision: 10, scale: 2 }),
  featuresLimit: integer("features_limit"), // NULL = unlimited
  tokensLimit: integer("tokens_limit"),
  usersLimit: integer("users_limit"),
  canExportJira: boolean("can_export_jira").default(false),
  canExportAzure: boolean("can_export_azure").default(false),
  hasApiAccess: boolean("has_api_access").default(false),
  hasPrioritySupport: boolean("has_priority_support").default(false),
  isActive: boolean("is_active").default(true),
  stripeMonthlyPriceId: varchar("stripe_monthly_price_id", { length: 255 }),
  stripeYearlyPriceId: varchar("stripe_yearly_price_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  status: subscriptionStatusEnum("status").notNull(),
  billingCycle: billingCycleEnum("billing_cycle").notNull(),
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  
  // External IDs
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  
  // Usage tracking
  featuresUsedThisPeriod: integer("features_used_this_period").default(0),
  tokensUsedThisPeriod: integer("tokens_used_this_period").default(0),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  subscriptionId: integer("subscription_id").notNull().references(() => subscriptions.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("BRL"),
  status: varchar("status", { length: 32 }).notNull(),
  stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
  paymentMethod: varchar("payment_method", { length: 64 }),
  errorMessage: text("error_message"),
  paidAt: timestamp("paid_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

---

## 🔧 2. Funções de Query

```typescript
// server/subscriptions.ts

import { eq, and, desc } from "drizzle-orm";
import { subscriptions, subscriptionPlans } from "../drizzle/schema";
import { getDb } from "./db";

export async function getActiveSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, userId),
        eq(subscriptions.status, "active")
      )
    )
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

export async function incrementFeatureUsage(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const subscription = await getActiveSubscription(userId);
  if (!subscription) return; // Free plan, no tracking needed
  
  await db
    .update(subscriptions)
    .set({
      featuresUsedThisPeriod: subscription.featuresUsedThisPeriod + 1,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));
}

export async function incrementTokenUsage(userId: number, tokens: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const subscription = await getActiveSubscription(userId);
  if (!subscription) return;
  
  await db
    .update(subscriptions)
    .set({
      tokensUsedThisPeriod: subscription.tokensUsedThisPeriod + tokens,
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
      featuresUsedThisPeriod: 0,
      tokensUsedThisPeriod: 0,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscriptionId));
}
```

---

## 🛡️ 3. Middleware de Verificação de Limites

```typescript
// server/_core/subscription-guard.ts

import { TRPCError } from "@trpc/server";
import * as subscriptionDb from "../subscriptions";

export class SubscriptionError extends TRPCError {
  constructor(message: string, public limitType: string) {
    super({
      code: "FORBIDDEN",
      message,
    });
  }
}

export async function checkFeatureLimit(userId: number) {
  const data = await subscriptionDb.getSubscriptionWithPlan(userId);
  
  // Sem assinatura = Free plan
  if (!data || !data.subscription) {
    const FREE_FEATURES_LIMIT = 10;
    const usedThisMonth = await countFeaturesThisMonth(userId);
    
    if (usedThisMonth >= FREE_FEATURES_LIMIT) {
      throw new SubscriptionError(
        `Você atingiu o limite de ${FREE_FEATURES_LIMIT} features do plano gratuito. Faça upgrade para continuar.`,
        "features"
      );
    }
    return true;
  }
  
  const { subscription, plan } = data;
  
  // Plano com limite
  if (plan.featuresLimit && subscription.featuresUsedThisPeriod >= plan.featuresLimit) {
    throw new SubscriptionError(
      `Você atingiu o limite de ${plan.featuresLimit} features do seu plano. Faça upgrade para continuar.`,
      "features"
    );
  }
  
  return true;
}

export async function checkTokenLimit(userId: number, tokensToUse: number) {
  const data = await subscriptionDb.getSubscriptionWithPlan(userId);
  
  if (!data || !data.subscription) {
    const FREE_TOKENS_LIMIT = 50000;
    const usedThisMonth = await getTokensUsedThisMonth(userId);
    
    if (usedThisMonth + tokensToUse > FREE_TOKENS_LIMIT) {
      throw new SubscriptionError(
        `Você atingiu o limite de ${FREE_TOKENS_LIMIT.toLocaleString()} tokens do plano gratuito. Faça upgrade para continuar.`,
        "tokens"
      );
    }
    return true;
  }
  
  const { subscription, plan } = data;
  
  if (plan.tokensLimit && subscription.tokensUsedThisPeriod + tokensToUse > plan.tokensLimit) {
    throw new SubscriptionError(
      `Você atingiu o limite de ${plan.tokensLimit.toLocaleString()} tokens do seu plano. Faça upgrade para continuar.`,
      "tokens"
    );
  }
  
  return true;
}

async function countFeaturesThisMonth(userId: number) {
  // Implementar: contar features criadas no mês atual
  const db = await getDb();
  if (!db) return 0;
  
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  
  const result = await db
    .select({ count: count() })
    .from(features)
    .where(
      and(
        eq(features.userId, userId),
        gte(features.createdAt, startOfMonth)
      )
    );
  
  return result[0]?.count || 0;
}
```

---

## 🔌 4. Integração com Stripe

```typescript
// server/_core/stripe.ts

import Stripe from "stripe";
import { ENV } from "./env";

export const stripe = new Stripe(ENV.STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
  typescript: true,
});

// Criar sessão de checkout
export async function createCheckoutSession({
  userId,
  userEmail,
  planId,
  billingCycle,
}: {
  userId: number;
  userEmail: string;
  planId: number;
  billingCycle: "monthly" | "yearly";
}) {
  const plan = await db.getSubscriptionPlan(planId);
  if (!plan) throw new Error("Plan not found");
  
  const priceId = billingCycle === "monthly" 
    ? plan.stripeMonthlyPriceId 
    : plan.stripeYearlyPriceId;
  
  if (!priceId) throw new Error("Price ID not configured");
  
  const session = await stripe.checkout.sessions.create({
    customer_email: userEmail,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${ENV.APP_URL}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${ENV.APP_URL}/pricing`,
    metadata: {
      userId: userId.toString(),
      planId: planId.toString(),
      billingCycle,
    },
    subscription_data: {
      trial_period_days: 7, // 7 dias de trial
      metadata: {
        userId: userId.toString(),
      },
    },
  });
  
  return session;
}

// Criar portal do cliente (para gerenciar assinatura)
export async function createCustomerPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${ENV.APP_URL}/account/subscription`,
  });
  
  return session;
}

// Cancelar assinatura
export async function cancelSubscription(subscriptionId: string, immediate: boolean = false) {
  if (immediate) {
    return await stripe.subscriptions.cancel(subscriptionId);
  } else {
    // Cancelar ao fim do período
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
}

// Reativar assinatura cancelada
export async function reactivateSubscription(subscriptionId: string) {
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}
```

---

## 🪝 5. Webhook Handler

```typescript
// server/webhooks/stripe.ts

import { Router } from "express";
import Stripe from "stripe";
import { stripe } from "../_core/stripe";
import * as db from "../subscriptions";

const router = Router();

router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    
    if (!sig) {
      return res.status(400).send("No signature");
    }
    
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    console.log(`[Webhook] Received event: ${event.type}`);
    
    try {
      switch (event.type) {
        case "checkout.session.completed":
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        
        case "customer.subscription.created":
          await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        
        case "customer.subscription.updated":
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        
        case "customer.subscription.deleted":
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        
        case "invoice.payment_succeeded":
          await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        
        case "invoice.payment_failed":
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        
        default:
          console.log(`[Webhook] Unhandled event type: ${event.type}`);
      }
      
      res.json({ received: true });
    } catch (error: any) {
      console.error(`[Webhook] Error processing event: ${error.message}`);
      res.status(500).send(`Webhook processing failed: ${error.message}`);
    }
  }
);

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = parseInt(session.metadata?.userId || "0");
  const planId = parseInt(session.metadata?.planId || "0");
  const billingCycle = session.metadata?.billingCycle as "monthly" | "yearly";
  
  if (!userId || !planId) {
    console.error("[Webhook] Missing metadata in checkout session");
    return;
  }
  
  // Criar assinatura no banco
  await db.createSubscription({
    userId,
    planId,
    status: "active",
    billingCycle,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 dias
    stripeSubscriptionId: session.subscription as string,
    stripeCustomerId: session.customer as string,
  });
  
  // Enviar email de boas-vindas
  // await sendWelcomeEmail(userId);
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const userId = parseInt(subscription.metadata?.userId || "0");
  
  await db.updateSubscriptionFromStripe({
    stripeSubscriptionId: subscription.id,
    status: subscription.status,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  await db.cancelSubscription(subscription.id);
  // Enviar email de cancelamento
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;
  
  await db.createPayment({
    subscriptionId: invoice.subscription as string,
    amount: invoice.amount_paid / 100, // Stripe usa centavos
    currency: invoice.currency.toUpperCase(),
    status: "succeeded",
    stripePaymentIntentId: invoice.payment_intent as string,
    paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
  });
  
  // Resetar contadores de uso para novo período
  await db.resetPeriodUsage(invoice.subscription as string);
  
  // Enviar email com fatura
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  await db.createPayment({
    subscriptionId: invoice.subscription as string,
    amount: invoice.amount_due / 100,
    currency: invoice.currency.toUpperCase(),
    status: "failed",
    errorMessage: invoice.last_finalization_error?.message,
  });
  
  // Enviar email alertando sobre falha
}

export default router;
```

---

## 🌐 6. Router tRPC

```typescript
// server/subscriptions.routers.ts

import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./subscriptions";
import { createCheckoutSession, createCustomerPortalSession } from "./_core/stripe";

export const subscriptionsRouter = router({
  // Buscar assinatura atual do usuário
  getCurrent: protectedProcedure.query(async ({ ctx }) => {
    return await db.getSubscriptionWithPlan(ctx.user.id);
  }),
  
  // Listar todos os planos disponíveis
  getPlans: protectedProcedure.query(async () => {
    return await db.getAllPlans();
  }),
  
  // Criar sessão de checkout
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
  
  // Criar sessão do portal do cliente
  createPortal: protectedProcedure.mutation(async ({ ctx }) => {
    const subscription = await db.getActiveSubscription(ctx.user.id);
    
    if (!subscription || !subscription.stripeCustomerId) {
      throw new Error("No active subscription found");
    }
    
    const session = await createCustomerPortalSession(subscription.stripeCustomerId);
    
    return { url: session.url };
  }),
  
  // Buscar uso atual
  getUsage: protectedProcedure.query(async ({ ctx }) => {
    const data = await db.getSubscriptionWithPlan(ctx.user.id);
    
    if (!data || !data.subscription) {
      // Free plan
      const featuresUsed = await countFeaturesThisMonth(ctx.user.id);
      const tokensUsed = await getTokensUsedThisMonth(ctx.user.id);
      
      return {
        features: { used: featuresUsed, limit: 10 },
        tokens: { used: tokensUsed, limit: 50000 },
      };
    }
    
    const { subscription, plan } = data;
    
    return {
      features: {
        used: subscription.featuresUsedThisPeriod,
        limit: plan.featuresLimit || null,
      },
      tokens: {
        used: subscription.tokensUsedThisPeriod,
        limit: plan.tokensLimit || null,
      },
    };
  }),
});
```

---

## 🎨 7. Componentes React

### PlanCard Component

```tsx
// client/src/components/PlanCard.tsx

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Check } from "lucide-react";

interface PlanCardProps {
  name: string;
  price: number;
  billingCycle: "monthly" | "yearly";
  features: string[];
  isPopular?: boolean;
  onSelect: () => void;
  isLoading?: boolean;
}

export function PlanCard({
  name,
  price,
  billingCycle,
  features,
  isPopular,
  onSelect,
  isLoading,
}: PlanCardProps) {
  return (
    <Card className={`relative ${isPopular ? "border-primary shadow-lg" : ""}`}>
      {isPopular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium">
            Mais Popular
          </span>
        </div>
      )}
      
      <CardHeader>
        <CardTitle className="text-2xl">{name}</CardTitle>
        <CardDescription>
          <span className="text-4xl font-bold">
            {price === 0 ? "Grátis" : `R$ ${price}`}
          </span>
          {price > 0 && (
            <span className="text-muted-foreground">
              /{billingCycle === "monthly" ? "mês" : "ano"}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <ul className="space-y-3">
          {features.map((feature, index) => (
            <li key={index} className="flex items-center gap-2">
              <Check className="h-5 w-5 text-primary flex-shrink-0" />
              <span className="text-sm">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      
      <CardFooter>
        <Button
          onClick={onSelect}
          disabled={isLoading}
          className="w-full"
          variant={isPopular ? "default" : "outline"}
        >
          {isLoading ? "Processando..." : "Selecionar Plano"}
        </Button>
      </CardFooter>
    </Card>
  );
}
```

### Usage Progress Component

```tsx
// client/src/components/UsageProgress.tsx

import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface UsageProgressProps {
  label: string;
  used: number;
  limit: number | null;
  unit: string;
}

export function UsageProgress({ label, used, limit, unit }: UsageProgressProps) {
  const percentage = limit ? (used / limit) * 100 : 0;
  const isUnlimited = limit === null;
  
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{label}</CardTitle>
        <CardDescription>
          {isUnlimited ? (
            <span className="text-primary font-medium">Ilimitado</span>
          ) : (
            <>
              <span className="font-semibold">{used.toLocaleString()}</span>
              {" / "}
              <span>{limit.toLocaleString()}</span>
              {" "}
              {unit}
            </>
          )}
        </CardDescription>
      </CardHeader>
      
      {!isUnlimited && (
        <CardContent>
          <Progress 
            value={percentage} 
            className={`h-2 ${percentage > 90 ? "bg-red-500" : ""}`}
          />
          {percentage > 80 && (
            <p className="text-sm text-muted-foreground mt-2">
              {percentage > 90 ? "⚠️ Limite quase atingido!" : "Você está próximo do limite"}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}
```

---

## 🚀 8. Usar no Features Router

```typescript
// server/features.routers.ts

import { checkFeatureLimit, checkTokenLimit } from "./_core/subscription-guard";
import { incrementFeatureUsage, incrementTokenUsage } from "./subscriptions";

export const featuresRouter = router({
  generate: protectedProcedure
    .input(...)
    .mutation(async ({ ctx, input }) => {
      // 1. Verificar limite ANTES de processar
      await checkFeatureLimit(ctx.user.id);
      
      // 2. Gerar feature
      const featureId = await generateFeature(ctx.user.id, input);
      
      // 3. Incrementar contador de uso
      await incrementFeatureUsage(ctx.user.id);
      
      return { featureId };
    }),
});
```

---

## 📧 9. Email Templates

```typescript
// server/emails/subscription-emails.ts

export async function sendWelcomeEmail(userId: number, planName: string) {
  const user = await db.getUserById(userId);
  
  await sendEmail({
    to: user.email,
    subject: `Bem-vindo ao Bardo ${planName}! 🎉`,
    html: `
      <h1>Obrigado por assinar o Bardo ${planName}!</h1>
      <p>Sua assinatura está ativa e você já pode aproveitar todos os benefícios.</p>
      <p><strong>O que você pode fazer agora:</strong></p>
      <ul>
        <li>Criar até ${planName === "Pro" ? "100" : "ilimitadas"} features por mês</li>
        <li>Usar até ${planName === "Pro" ? "500.000" : "2.000.000"} tokens</li>
        <li>Exportar para Jira e Azure DevOps</li>
      </ul>
      <a href="https://seusite.com/generate">Começar Agora</a>
    `,
  });
}
```

---

## ✅ Pronto!

Este arquivo contém exemplos práticos de código que você pode usar como base quando decidir implementar o sistema de assinaturas! 🚀






