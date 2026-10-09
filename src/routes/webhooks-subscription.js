// Keep the monolith's existing route registration while sharing the platform's
// authoritative receipt, entitlement and AuthFor provisioning implementation.
// The platform catalogue includes the live first-submittal offer omitted by the
// old monolith catalogue. Signature verifiers remain the monolith's injected deps.
import { registerWebhooksSubscriptionRoutes as registerCanonical } from "../../weyland-platform-worker/src/routes/webhooks-subscription.js";
import { WEYLAND_PRODUCTS } from "../../weyland-platform-worker/src/lib/stripe-billing.js";

export function registerWebhooksSubscriptionRoutes(router, { verifyVendyaiForwardSignature, verifyStripeWebhookSignature }) {
  return registerCanonical(router, { WEYLAND_PRODUCTS, verifyVendyaiForwardSignature, verifyStripeWebhookSignature });
}
