export type Plan = {
  lookupKey: "pro_monthly" | "pro_yearly";
  interval: "month" | "year";
  unitAmount: number;
};

export const PLANS: Plan[];

export function assertSandboxKey(key: string | undefined): void;

// The parts of the Stripe client the script uses, so tests can pass a fake.
export type SetupStripe = {
  products: {
    list(params: object): Promise<{ data: object[] }>;
    create(params: object): Promise<{ id: string }>;
  };
  prices: {
    list(params: object): Promise<{ data: object[] }>;
    create(params: object): Promise<{ id: string }>;
  };
  billingPortal: {
    configurations: {
      list(params: object): Promise<{ data: object[] }>;
      create(params: object): Promise<{ id: string }>;
      update(id: string, params: object): Promise<object>;
    };
  };
};

export function ensureStripeSetup(stripe: SetupStripe): Promise<{
  productId: string;
  prices: Record<Plan["lookupKey"], string>;
  portalConfigurationId: string;
}>;
