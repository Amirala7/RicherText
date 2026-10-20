import { describe, expect, it } from "vitest";
import {
  assertSandboxKey,
  ensureStripeSetup,
  PLANS,
} from "../../scripts/stripe-setup.mjs";

// The Stripe sandbox setup script (ADR 0027): one product, monthly and yearly
// prices found by lookup key, and the Customer Portal configuration. Safe to
// run again. Tested with an in-memory Stripe so no keys are needed.

type Obj = Record<string, unknown> & { id: string };

function fakeStripe() {
  const products: Obj[] = [];
  const prices: Obj[] = [];
  const configs: Obj[] = [];
  const created: string[] = [];
  let n = 0;
  const id = (p: string) => `${p}_${++n}`;
  const list = <T>(data: T[]) => ({ object: "list", data, has_more: false });

  return {
    products,
    prices,
    configs,
    created,
    client: {
      products: {
        list: async () => list(products.filter((p) => p.active !== false)),
        create: async (params: Record<string, unknown>) => {
          const p = { id: id("prod"), active: true, ...params };
          products.push(p);
          created.push("product");
          return p;
        },
      },
      prices: {
        list: async (params: { lookup_keys?: string[] }) =>
          list(
            prices.filter(
              (p) =>
                p.active !== false &&
                (!params.lookup_keys ||
                  params.lookup_keys.includes(p.lookup_key as string)),
            ),
          ),
        create: async (params: Record<string, unknown>) => {
          if (params.transfer_lookup_key) {
            for (const p of prices) {
              if (p.lookup_key === params.lookup_key) p.lookup_key = null;
            }
          }
          const { transfer_lookup_key: _t, ...rest } = params;
          void _t;
          const p = { id: id("price"), active: true, ...rest };
          prices.push(p);
          created.push(`price:${params.lookup_key}`);
          return p;
        },
      },
      billingPortal: {
        configurations: {
          list: async () => list(configs.filter((c) => c.active !== false)),
          create: async (params: Record<string, unknown>) => {
            const c = { id: id("bpc"), active: true, ...params };
            configs.push(c);
            created.push("portal");
            return c;
          },
          update: async (cid: string, params: Record<string, unknown>) => {
            const c = configs.find((x) => x.id === cid)!;
            Object.assign(c, params);
            return c;
          },
        },
      },
    },
  };
}

describe("stripe setup: plans", () => {
  it("defines monthly and yearly in USD at the placeholder prices", () => {
    expect(PLANS).toEqual([
      { lookupKey: "pro_monthly", interval: "month", unitAmount: 800 },
      { lookupKey: "pro_yearly", interval: "year", unitAmount: 8000 },
    ]);
  });
});

describe("stripe setup: fresh sandbox", () => {
  it("creates one product, two prices and a portal configuration", async () => {
    const stripe = fakeStripe();
    const result = await ensureStripeSetup(stripe.client);

    expect(stripe.products).toHaveLength(1);
    expect(stripe.products[0]).toMatchObject({
      name: "RicherText",
      metadata: { app: "richertext" },
    });
    const productId = stripe.products[0].id;

    expect(stripe.prices).toHaveLength(2);
    expect(stripe.prices).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          product: productId,
          currency: "usd",
          unit_amount: 800,
          recurring: { interval: "month" },
          lookup_key: "pro_monthly",
        }),
        expect.objectContaining({
          product: productId,
          currency: "usd",
          unit_amount: 8000,
          recurring: { interval: "year" },
          lookup_key: "pro_yearly",
        }),
      ]),
    );

    expect(result.productId).toBe(productId);
    expect(Object.keys(result.prices).sort()).toEqual([
      "pro_monthly",
      "pro_yearly",
    ]);
    expect(result.portalConfigurationId).toBe(stripe.configs[0].id);
  });

  it("sets up the portal for card, invoices, switching interval and cancelling at period end", async () => {
    const stripe = fakeStripe();
    const result = await ensureStripeSetup(stripe.client);
    const config = stripe.configs[0];

    expect(config.metadata).toEqual({ app: "richertext" });
    expect(config.features).toMatchObject({
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      subscription_cancel: { enabled: true, mode: "at_period_end" },
      subscription_update: {
        enabled: true,
        default_allowed_updates: ["price"],
        products: [
          {
            product: result.productId,
            prices: [result.prices.pro_monthly, result.prices.pro_yearly],
          },
        ],
      },
    });
  });
});

describe("stripe setup: running again", () => {
  it("creates nothing the second time", async () => {
    const stripe = fakeStripe();
    const first = await ensureStripeSetup(stripe.client);
    stripe.created.length = 0;

    const second = await ensureStripeSetup(stripe.client);

    expect(stripe.created).toEqual([]);
    expect(second).toEqual(first);
  });

  it("moves the lookup key to a new price when the amount changes", async () => {
    const stripe = fakeStripe();
    const first = await ensureStripeSetup(stripe.client);
    const monthly = stripe.prices.find((p) => p.lookup_key === "pro_monthly")!;
    monthly.unit_amount = 700;
    stripe.created.length = 0;

    const second = await ensureStripeSetup(stripe.client);

    expect(stripe.created).toEqual(["price:pro_monthly"]);
    expect(second.productId).toBe(first.productId);
    expect(second.prices.pro_monthly).not.toBe(first.prices.pro_monthly);
    expect(second.prices.pro_yearly).toBe(first.prices.pro_yearly);
    const current = stripe.prices.find((p) => p.lookup_key === "pro_monthly")!;
    expect(current.unit_amount).toBe(800);
  });
});

describe("stripe setup: sandbox only", () => {
  it.each(["sk_test_abc123", "rk_test_abc123"])("accepts %s", (key) => {
    expect(() => assertSandboxKey(key)).not.toThrow();
  });

  it.each([
    ["a live secret key", "sk_live_abc123"],
    ["a live restricted key", "rk_live_abc123"],
    ["the placeholder", "sk_test_replace_me"],
    ["nothing", undefined],
    ["a publishable key", "pk_test_abc123"],
  ])("refuses %s", (_label, key) => {
    expect(() => assertSandboxKey(key)).toThrow();
  });
});
