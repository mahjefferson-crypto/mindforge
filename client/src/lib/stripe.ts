/**
 * Stripe Configuration — Mind Forge Pro
 *
 * HOW TO CONNECT REAL STRIPE:
 *
 * 1. Create a free Stripe account at https://stripe.com
 * 2. In Stripe Dashboard → Products, create a product "Mind Forge Pro" with:
 *    - Price: £3.99/month recurring
 *    - Copy the Price ID (starts with price_...)
 * 3. Get your Publishable Key from Stripe Dashboard → Developers → API Keys
 * 4. Get your Secret Key (same place)
 * 5. Replace the values below:
 */

// ─── Replace these with your real Stripe keys ────────────────────
export const STRIPE_PUBLISHABLE_KEY = ""; // e.g. "pk_live_..." or "pk_test_..."
export const STRIPE_PRICE_ID = "";        // e.g. "price_1234..."

// ─── Server-side: add to environment variables ───────────────────
// STRIPE_SECRET_KEY=sk_live_...  (or sk_test_...)
// Never expose the secret key in frontend code.

/**
 * When keys are set, the upgrade page will redirect to Stripe Checkout
 * instead of showing the mock card form.
 *
 * To enable Stripe Checkout:
 * 1. npm install stripe @stripe/stripe-js
 * 2. Add a POST /api/create-checkout-session route on the server
 * 3. The frontend will call that route and redirect to Stripe
 * 4. On success, Stripe redirects back and triggers /api/subscribe
 *
 * The mock payment flow works perfectly for demos and testing.
 */

export const isStripeConfigured = (): boolean => {
  return STRIPE_PUBLISHABLE_KEY.length > 0 && STRIPE_PRICE_ID.length > 0;
};
