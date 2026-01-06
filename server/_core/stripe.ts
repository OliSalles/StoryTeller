import Stripe from "stripe";
import { ENV } from "./env";
import * as subscriptionDb from "../subscriptions";

// Initialize Stripe (only if key is provided)
export const stripe = ENV.stripeSecretKey 
  ? new Stripe(ENV.stripeSecretKey, {
      apiVersion: "2024-12-18.acacia",
      typescript: true,
    })
  : null;

// Log Stripe configuration status
if (ENV.stripeSecretKey) {
  console.log("✅ Stripe initialized successfully");
} else {
  console.warn("⚠️ Stripe not configured - STRIPE_SECRET_KEY missing");
}

// Create checkout session for new subscription
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
  if (!stripe) {
    throw new Error("Stripe não está configurado. Adicione STRIPE_SECRET_KEY no .env");
  }
  
  const plan = await subscriptionDb.getPlanById(planId);
  if (!plan) throw new Error("Plan not found");
  
  const priceId = billingCycle === "monthly" 
    ? plan.stripeMonthlyPriceId 
    : plan.stripeYearlyPriceId;
  
  if (!priceId) throw new Error("Price ID not configured for this plan");
  
  const appUrl = ENV.isProduction 
    ? ENV.appUrl || "https://storytellerboard.com"
    : ENV.appUrl;
  
  console.log(`[Stripe] Creating checkout session with appUrl: ${appUrl}`);
  console.log(`[Stripe] Success URL will be: ${appUrl}/subscription/success`);
  console.log(`[Stripe] ENV.appUrl value: ${ENV.appUrl}`);
  
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    customer_email: userEmail,
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: `${appUrl}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/pricing`,
    metadata: {
      userId: userId.toString(),
      planId: planId.toString(),
      billingCycle,
    },
    subscription_data: {
      metadata: {
        userId: userId.toString(),
      },
    },
  };
  
  // Add trial if plan has it
  if (plan.hasTrialDays && plan.hasTrialDays > 0) {
    sessionConfig.subscription_data = {
      ...sessionConfig.subscription_data,
      trial_period_days: plan.hasTrialDays,
    };
  }
  
  const session = await stripe.checkout.sessions.create(sessionConfig);
  
  return session;
}

// Create customer portal session (for managing subscription)
export async function createCustomerPortalSession(customerId: string) {
  if (!stripe) {
    throw new Error("Stripe não está configurado. Adicione STRIPE_SECRET_KEY no .env");
  }
  
  const appUrl = ENV.isProduction 
    ? ENV.appUrl || "https://storytellerboard.com"
    : ENV.appUrl;
  
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/account/subscription`,
  });
  
  return session;
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string, immediate: boolean = false) {
  if (!stripe) {
    throw new Error("Stripe não está configurado");
  }
  
  if (immediate) {
    return await stripe.subscriptions.cancel(subscriptionId);
  } else {
    // Cancel at end of period
    return await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
  }
}

// Reactivate canceled subscription
export async function reactivateSubscription(subscriptionId: string) {
  if (!stripe) {
    throw new Error("Stripe não está configurado");
  }
  
  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });
}

// Get subscription from Stripe
export async function getStripeSubscription(subscriptionId: string) {
  if (!stripe) {
    throw new Error("Stripe não está configurado");
  }
  
  return await stripe.subscriptions.retrieve(subscriptionId);
}

