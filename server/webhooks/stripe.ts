import { Router } from "express";
import Stripe from "stripe";
import { stripe } from "../_core/stripe";
import { ENV } from "../_core/env";
import * as db from "../subscriptions";

const router = Router();

router.post(
  "/stripe",
  async (req, res) => {
    console.log("\n");
    console.log("=".repeat(60));
    console.log("[Webhook] 🎯 Received Stripe webhook request");
    console.log("[Webhook] Timestamp:", new Date().toISOString());
    console.log("=".repeat(60));
    
    if (!stripe) {
      console.warn("[Webhook] ❌ Stripe não está configurado");
      return res.status(503).send("Stripe not configured");
    }
    
    const sig = req.headers["stripe-signature"];
    
    if (!sig) {
      console.error("[Webhook] ❌ No signature provided");
      console.error("[Webhook] Headers received:", Object.keys(req.headers));
      return res.status(400).send("No signature");
    }
    
    console.log("[Webhook] ✅ Signature found:", sig.substring(0, 30) + "...");
    console.log("[Webhook] Webhook secret configured:", ENV.stripeWebhookSecret ? "Yes" : "No");
    
    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        ENV.stripeWebhookSecret || ""
      );
      console.log("[Webhook] ✅ Signature verified successfully");
    } catch (err: any) {
      console.error(`[Webhook] ❌ Signature verification failed: ${err.message}`);
      console.error(`[Webhook] Expected secret starts with: ${(ENV.stripeWebhookSecret || "").substring(0, 10)}...`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    console.log("\n");
    console.log(`[Webhook] 📨 Event Type: ${event.type}`);
    console.log(`[Webhook] Event ID: ${event.id}`);
    console.log(`[Webhook] Event created: ${new Date(event.created * 1000).toISOString()}`);
    console.log("\n");
    
    try {
      switch (event.type) {
        case "checkout.session.completed":
          console.log("[Webhook] 🛒 Handling checkout.session.completed");
          await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
          break;
        
        case "customer.subscription.created":
          console.log("[Webhook] 📝 Handling customer.subscription.created");
          await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
          break;
        
        case "customer.subscription.updated":
          console.log("[Webhook] 🔄 Handling customer.subscription.updated");
          await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
          break;
        
        case "customer.subscription.deleted":
          console.log("[Webhook] 🗑️  Handling customer.subscription.deleted");
          await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
          break;
        
        case "invoice.payment_succeeded":
          console.log("[Webhook] 💰 Handling invoice.payment_succeeded");
          await handlePaymentSucceeded(event.data.object as Stripe.Invoice);
          break;
        
        case "invoice.payment_failed":
          console.log("[Webhook] ❌ Handling invoice.payment_failed");
          await handlePaymentFailed(event.data.object as Stripe.Invoice);
          break;
        
        // Customer Portal Events
        case "payment_method.attached":
          console.log("[Webhook] 💳 Handling payment_method.attached");
          await handlePaymentMethodAttached(event.data.object as Stripe.PaymentMethod);
          break;
        
        case "payment_method.detached":
          console.log("[Webhook] 💳 Handling payment_method.detached");
          await handlePaymentMethodDetached(event.data.object as Stripe.PaymentMethod);
          break;
        
        case "customer.updated":
          console.log("[Webhook] 👤 Handling customer.updated");
          await handleCustomerUpdated(event.data.object as Stripe.Customer);
          break;
        
        case "customer.tax_id.created":
          console.log("[Webhook] 🧾 Handling customer.tax_id.created");
          await handleCustomerTaxIdCreated(event.data.object);
          break;
        
        case "customer.tax_id.deleted":
          console.log("[Webhook] 🧾 Handling customer.tax_id.deleted");
          await handleCustomerTaxIdDeleted(event.data.object);
          break;
        
        case "customer.tax_id.updated":
          console.log("[Webhook] 🧾 Handling customer.tax_id.updated");
          await handleCustomerTaxIdUpdated(event.data.object);
          break;
        
        case "billing_portal.configuration.created":
          console.log("[Webhook] ⚙️  Handling billing_portal.configuration.created");
          await handlePortalConfigCreated(event.data.object);
          break;
        
        case "billing_portal.configuration.updated":
          console.log("[Webhook] ⚙️  Handling billing_portal.configuration.updated");
          await handlePortalConfigUpdated(event.data.object);
          break;
        
        case "billing_portal.session.created":
          console.log("[Webhook] 🚪 Handling billing_portal.session.created");
          await handlePortalSessionCreated(event.data.object);
          break;
        
        default:
          console.log(`[Webhook] ℹ️  Unhandled event type: ${event.type}`);
      }
      
      console.log("[Webhook] ✅ Event processed successfully");
      console.log("=".repeat(60));
      console.log("\n");
      res.json({ received: true });
    } catch (error: any) {
      console.error(`[Webhook] ❌ Error processing event: ${error.message}`);
      console.error(`[Webhook] Stack trace:`, error.stack);
      console.log("=".repeat(60));
      console.log("\n");
      res.status(500).send(`Webhook processing failed: ${error.message}`);
    }
  }
);

// Handle checkout completed
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  console.log("[Webhook] ========================================");
  console.log("[Webhook] Processing checkout.session.completed");
  console.log("[Webhook] Session ID:", session.id);
  console.log("[Webhook] Session metadata:", JSON.stringify(session.metadata, null, 2));
  
  const userId = parseInt(session.metadata?.userId || "0");
  const planId = parseInt(session.metadata?.planId || "0");
  const billingCycle = session.metadata?.billingCycle as "monthly" | "yearly";
  
  console.log("[Webhook] Parsed values:");
  console.log("[Webhook]   userId:", userId);
  console.log("[Webhook]   planId:", planId);
  console.log("[Webhook]   billingCycle:", billingCycle);
  
  if (!userId || !planId) {
    console.error("[Webhook] ❌ Missing metadata in checkout session");
    console.error("[Webhook]    userId:", userId, "planId:", planId);
    return;
  }
  
  // Get subscription object from Stripe
  if (!session.subscription) {
    console.error("[Webhook] ❌ No subscription in session");
    console.error("[Webhook]    Session object:", JSON.stringify(session, null, 2).substring(0, 1000));
    return;
  }
  
  console.log("[Webhook] Retrieving subscription from Stripe:", session.subscription);
  const stripeSubscription = await stripe!.subscriptions.retrieve(
    session.subscription as string
  );
  console.log("[Webhook] Stripe subscription retrieved:");
  console.log("[Webhook]   ID:", stripeSubscription.id);
  console.log("[Webhook]   Status:", stripeSubscription.status);
  console.log("[Webhook]   Customer:", stripeSubscription.customer);
  
  // Create subscription in database
  console.log("[Webhook] Creating subscription in database...");
  try {
    const subscriptionData = {
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
    };
    
    console.log("[Webhook] Subscription data:", JSON.stringify(subscriptionData, null, 2));
    
    await db.createSubscription(subscriptionData);
    
    console.log(`[Webhook] ✅ Created subscription for user ${userId}`);
    console.log("[Webhook] ========================================");
  } catch (error: any) {
    console.error("[Webhook] ❌ Error creating subscription in database:", error.message);
    console.error("[Webhook] Stack:", error.stack);
    throw error;
  }
  
  // TODO: Send welcome email
}

// Handle subscription updated
async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  console.log("[Webhook] Processing customer.subscription.updated");
  
  await db.updateSubscriptionByStripeId(subscription.id, {
    status: subscription.status as any,
    currentPeriodStart: new Date(subscription.current_period_start * 1000),
    currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
  
  console.log(`[Webhook] Updated subscription ${subscription.id}`);
}

// Handle subscription deleted
async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  console.log("[Webhook] Processing customer.subscription.deleted");
  
  const dbSubscription = await db.getSubscriptionByStripeId(subscription.id);
  if (dbSubscription) {
    await db.cancelSubscription(dbSubscription.id);
    console.log(`[Webhook] Canceled subscription ${subscription.id}`);
  }
  
  // TODO: Send cancellation email
}

// Handle subscription created
async function handleSubscriptionCreated(subscription: Stripe.Subscription) {
  console.log("[Webhook] Processing customer.subscription.created");
  // Usually handled by checkout.session.completed
}

// Handle payment succeeded
async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  console.log("[Webhook] Processing invoice.payment_succeeded");
  
  if (!invoice.subscription) return;
  
  const dbSubscription = await db.getSubscriptionByStripeId(invoice.subscription as string);
  if (!dbSubscription) {
    console.error(`[Webhook] Subscription not found: ${invoice.subscription}`);
    return;
  }
  
  // Record payment
  await db.createPayment({
    subscriptionId: dbSubscription.id,
    amount: invoice.amount_paid,
    currency: invoice.currency.toUpperCase(),
    status: "succeeded",
    stripePaymentIntentId: invoice.payment_intent as string,
    paymentMethod: "card",
    paidAt: new Date(invoice.status_transitions.paid_at! * 1000),
  });
  
  // Reset usage for new period
  await db.resetPeriodUsage(dbSubscription.id);
  
  console.log(`[Webhook] Payment succeeded for subscription ${dbSubscription.id}`);
  
  // TODO: Send receipt email
}

// Handle payment failed
async function handlePaymentFailed(invoice: Stripe.Invoice) {
  console.log("[Webhook] Processing invoice.payment_failed");
  
  if (!invoice.subscription) return;
  
  const dbSubscription = await db.getSubscriptionByStripeId(invoice.subscription as string);
  if (!dbSubscription) {
    console.error(`[Webhook] Subscription not found: ${invoice.subscription}`);
    return;
  }
  
  // Record failed payment
  await db.createPayment({
    subscriptionId: dbSubscription.id,
    amount: invoice.amount_due,
    currency: invoice.currency.toUpperCase(),
    status: "failed",
    errorMessage: invoice.last_finalization_error?.message || "Payment failed",
  });
  
  console.log(`[Webhook] Payment failed for subscription ${dbSubscription.id}`);
  
  // TODO: Send payment failed email
}

// Handle payment method attached (via Customer Portal)
async function handlePaymentMethodAttached(paymentMethod: Stripe.PaymentMethod) {
  console.log("[Webhook] Processing payment_method.attached");
  console.log(`[Webhook] Payment method ${paymentMethod.id} attached to customer ${paymentMethod.customer}`);
  
  // Você pode registrar isso no banco se necessário
  // Por enquanto, apenas logamos o evento
}

// Handle payment method detached (via Customer Portal)
async function handlePaymentMethodDetached(paymentMethod: Stripe.PaymentMethod) {
  console.log("[Webhook] Processing payment_method.detached");
  console.log(`[Webhook] Payment method ${paymentMethod.id} detached from customer ${paymentMethod.customer}`);
  
  // Você pode registrar isso no banco se necessário
  // Por enquanto, apenas logamos o evento
}

// Handle customer updated (via Customer Portal)
async function handleCustomerUpdated(customer: Stripe.Customer) {
  console.log("[Webhook] Processing customer.updated");
  console.log(`[Webhook] Customer ${customer.id} updated`);
  
  // Atualizar informações de faturamento se necessário
  if (customer.invoice_settings?.default_payment_method) {
    console.log(`[Webhook] Default payment method updated to: ${customer.invoice_settings.default_payment_method}`);
  }
  
  // Atualizar email se necessário
  if (customer.email) {
    console.log(`[Webhook] Customer email: ${customer.email}`);
    // TODO: Atualizar email no banco se necessário
  }
}

// Handle customer tax ID created
async function handleCustomerTaxIdCreated(taxId: any) {
  console.log("[Webhook] Processing customer.tax_id.created");
  console.log(`[Webhook] Tax ID created for customer ${taxId.customer}`);
  console.log(`[Webhook] Type: ${taxId.type}, Value: ${taxId.value}, Verification status: ${taxId.verification?.status}`);
}

// Handle customer tax ID deleted
async function handleCustomerTaxIdDeleted(taxId: any) {
  console.log("[Webhook] Processing customer.tax_id.deleted");
  console.log(`[Webhook] Tax ID ${taxId.id} deleted for customer ${taxId.customer}`);
}

// Handle customer tax ID updated
async function handleCustomerTaxIdUpdated(taxId: any) {
  console.log("[Webhook] Processing customer.tax_id.updated");
  console.log(`[Webhook] Tax ID ${taxId.id} updated for customer ${taxId.customer}`);
  console.log(`[Webhook] Verification status: ${taxId.verification?.status}`);
}

// Handle billing portal configuration created
async function handlePortalConfigCreated(config: any) {
  console.log("[Webhook] Processing billing_portal.configuration.created");
  console.log(`[Webhook] Portal configuration ${config.id} created`);
}

// Handle billing portal configuration updated
async function handlePortalConfigUpdated(config: any) {
  console.log("[Webhook] Processing billing_portal.configuration.updated");
  console.log(`[Webhook] Portal configuration ${config.id} updated`);
}

// Handle billing portal session created
async function handlePortalSessionCreated(session: any) {
  console.log("[Webhook] Processing billing_portal.session.created");
  console.log(`[Webhook] Portal session ${session.id} created for customer ${session.customer}`);
  console.log(`[Webhook] Return URL: ${session.return_url}`);
}

export default router;

