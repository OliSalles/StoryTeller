import { TRPCError } from "@trpc/server";
import * as subscriptionDb from "../subscriptions";
import * as db from "../db";

export class SubscriptionError extends TRPCError {
  constructor(message: string, public limitType: string, public planName: string) {
    super({
      code: "FORBIDDEN",
      message,
    });
  }
}

// Free plan limits
const FREE_TOKENS_LIMIT = 50000;

// Check if user can create a feature (all plans now have unlimited features)
export async function checkFeatureLimit(userId: number) {
  // All plans now have unlimited features
  return true;
}

// Check if user can use tokens
export async function checkTokenLimit(userId: number, tokensToUse: number) {
  const data = await subscriptionDb.getSubscriptionWithPlan(userId);
  
  // No subscription = Free plan
  if (!data || !data.subscription) {
    // Buscar tokens reais usados no mês
    const tokensUsedThisMonth = await db.getTokenUsageThisMonth(userId);
    
    if (tokensUsedThisMonth + tokensToUse > FREE_TOKENS_LIMIT) {
      throw new SubscriptionError(
        `Você está próximo ou atingiu o limite de ${FREE_TOKENS_LIMIT.toLocaleString()} tokens do plano gratuito. Faça upgrade para continuar!`,
        "tokens",
        "free"
      );
    }
    return true;
  }
  
  const { subscription, plan } = data;
  
  // Para planos pagos, buscar tokens reais do período da assinatura
  const periodStart = new Date(subscription.currentPeriodStart);
  const tokensUsedThisPeriod = await db.getTokenUsageSinceDate(userId, periodStart);
  
  // Check token limit
  if (plan.tokensLimit && tokensUsedThisPeriod + tokensToUse > plan.tokensLimit) {
    throw new SubscriptionError(
      `Você atingiu o limite de ${plan.tokensLimit.toLocaleString()} tokens do plano ${plan.displayName}. ` +
      (plan.name === "pro" 
        ? "Faça upgrade para o plano Business para ter 2M de tokens!" 
        : "Entre em contato para aumentar seu limite."),
      "tokens",
      plan.name
    );
  }
  
  return true;
}

// Get current usage and limits
export async function getCurrentUsage(userId: number) {
  const data = await subscriptionDb.getSubscriptionWithPlan(userId);
  
  // No subscription = Free plan
  if (!data || !data.subscription) {
    const featuresUsed = await subscriptionDb.countFeaturesThisMonth(userId);
    // Buscar tokens reais usados no mês
    const tokensUsedThisMonth = await db.getTokenUsageThisMonth(userId);
    
    return {
      plan: {
        name: "free",
        displayName: "Gratuito",
      },
      features: {
        used: featuresUsed,
        limit: null, // Unlimited features
        percentage: 0,
      },
      tokens: {
        used: tokensUsedThisMonth,
        limit: FREE_TOKENS_LIMIT,
        percentage: (tokensUsedThisMonth / FREE_TOKENS_LIMIT) * 100,
      },
    };
  }
  
  const { subscription, plan } = data;
  
  // Para planos pagos, buscar tokens reais do período da assinatura
  const periodStart = new Date(subscription.currentPeriodStart);
  const tokensUsedThisPeriod = await db.getTokenUsageSinceDate(userId, periodStart);
  
  return {
    plan: {
      name: plan.name,
      displayName: plan.displayName,
    },
    features: {
      used: "unlimited",
      limit: null,
      percentage: 0,
    },
    tokens: {
      used: tokensUsedThisPeriod,
      limit: plan.tokensLimit,
      percentage: plan.tokensLimit 
        ? (tokensUsedThisPeriod / plan.tokensLimit) * 100 
        : 0,
    },
  };
}

// Check if user has paid plan (Pro or Business)
export async function hasPaidPlan(userId: number): Promise<boolean> {
  const data = await subscriptionDb.getSubscriptionWithPlan(userId);
  
  // No subscription = Free plan
  if (!data || !data.subscription) {
    return false;
  }
  
  const { subscription, plan } = data;
  
  // Check if subscription is active AND plan is paid
  return (
    subscription.status === "active" && 
    (plan.name === "pro" || plan.name === "business")
  );
}

// Get user's subscription status and plan info
export async function getUserSubscriptionInfo(userId: number) {
  const data = await subscriptionDb.getSubscriptionWithPlan(userId);
  
  // No subscription = Free plan
  if (!data || !data.subscription) {
    return {
      hasPaidPlan: false,
      planName: "free",
      planDisplayName: "Gratuito",
      status: null,
      canExportJira: false,
      canExportAzure: false,
      hasApiAccess: false,
      hasPrioritySupport: false,
    };
  }
  
  const { subscription, plan } = data;
  
  return {
    hasPaidPlan: subscription.status === "active" && (plan.name === "pro" || plan.name === "business"),
    planName: plan.name,
    planDisplayName: plan.displayName,
    status: subscription.status,
    canExportJira: plan.canExportJira || false,
    canExportAzure: plan.canExportAzure || false,
    hasApiAccess: plan.hasApiAccess || false,
    hasPrioritySupport: plan.hasPrioritySupport || false,
    currentPeriodEnd: subscription.currentPeriodEnd,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  };
}


