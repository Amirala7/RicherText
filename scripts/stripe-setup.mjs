// Sets up the Stripe sandbox for RicherText (ADR 0027): one product, monthly
// and yearly prices found by lookup key, and the Customer Portal
// configuration. Safe to run again: it only creates what's missing, and moves
// a lookup key to a new price when an amount changes (Stripe prices can't be
// edited). Sandbox keys only.
//
//   pnpm stripe:setup
import { pathToFileURL } from "node:url";

const APP = "richertext";

// Placeholder prices until they're decided (CONTEXT §6).
export const PLANS = [
  { lookupKey: "pro_monthly", interval: "month", unitAmount: 800 },
  { lookupKey: "pro_yearly", interval: "year", unitAmount: 8000 },
];

export function assertSandboxKey(key) {
  if (!key || !/^(sk|rk)_test_/.test(key) || key.includes("replace_me")) {
    throw new Error(
      "STRIPE_SECRET_KEY must be a sandbox (test mode) secret key: sk_test_… or rk_test_…",
    );
  }
}

async function ensureProduct(stripe) {
  const { data } = await stripe.products.list({ active: true, limit: 100 });
  const found = data.find((p) => p.metadata?.app === APP);
  if (found) return found.id;
  const product = await stripe.products.create({
    name: "RicherText",
    metadata: { app: APP },
  });
  return product.id;
}

async function ensurePrices(stripe, productId) {
  const { data } = await stripe.prices.list({
    active: true,
    lookup_keys: PLANS.map((p) => p.lookupKey),
    limit: 100,
  });
  const prices = {};
  for (const plan of PLANS) {
    const current = data.find(
      (p) =>
        p.lookup_key === plan.lookupKey &&
        p.product === productId &&
        p.currency === "usd" &&
        p.unit_amount === plan.unitAmount &&
        p.recurring?.interval === plan.interval,
    );
    if (current) {
      prices[plan.lookupKey] = current.id;
      continue;
    }
    const created = await stripe.prices.create({
      product: productId,
      currency: "usd",
      unit_amount: plan.unitAmount,
      recurring: { interval: plan.interval },
      lookup_key: plan.lookupKey,
      transfer_lookup_key: true,
    });
    prices[plan.lookupKey] = created.id;
  }
  return prices;
}

// Everything about an existing subscription happens in the Portal (ADR 0027).
function portalParams(productId, prices) {
  return {
    metadata: { app: APP },
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: false },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        proration_behavior: "create_prorations",
        products: [
          {
            product: productId,
            prices: PLANS.map((p) => prices[p.lookupKey]),
          },
        ],
      },
    },
  };
}

async function ensurePortal(stripe, productId, prices) {
  const params = portalParams(productId, prices);
  const { data } = await stripe.billingPortal.configurations.list({
    active: true,
    limit: 100,
  });
  const found = data.find((c) => c.metadata?.app === APP);
  if (found) {
    await stripe.billingPortal.configurations.update(found.id, params);
    return found.id;
  }
  const created = await stripe.billingPortal.configurations.create(params);
  return created.id;
}

export async function ensureStripeSetup(stripe) {
  const productId = await ensureProduct(stripe);
  const prices = await ensurePrices(stripe, productId);
  const portalConfigurationId = await ensurePortal(stripe, productId, prices);
  return { productId, prices, portalConfigurationId };
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY;
  assertSandboxKey(key);
  const { default: Stripe } = await import("stripe");
  const result = await ensureStripeSetup(new Stripe(key));
  const say = (line) => process.stdout.write(`${line}\n`);
  say("Stripe sandbox is set up:");
  say(`  product   ${result.productId}`);
  for (const plan of PLANS) {
    say(`  ${plan.lookupKey.padEnd(9)} ${result.prices[plan.lookupKey]}`);
  }
  say(`  portal    ${result.portalConfigurationId}`);
  say("");
  say("One setting lives in the Stripe Dashboard, not here (ADR 0027):");
  say("  Billing → Revenue recovery → Retries: when all retries fail,");
  say('  set the subscription to "Cancel the subscription".');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((err) => {
    process.stderr.write(`${err.message}\n`);
    process.exit(1);
  });
}
