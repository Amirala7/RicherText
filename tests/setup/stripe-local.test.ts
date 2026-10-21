import { describe, expect, it } from "vitest";
import {
  functionsSecretFile,
  LISTEN_EVENTS,
  listenArgs,
  redactSecrets,
  webhookUrl,
} from "../../scripts/stripe-local.mjs";

// Local Stripe wiring for the real sandbox run (ADR 0027 slice 4): the
// Functions emulator reads its secrets from functions/.secret.local, and the
// Stripe CLI forwards sandbox events to the emulator's webhook.

const key = "sk_test_abc123";
const whsec = "whsec_def456";

describe("functionsSecretFile", () => {
  it("writes both secrets the webhook Function declares", () => {
    expect(
      functionsSecretFile({
        STRIPE_SECRET_KEY: key,
        STRIPE_WEBHOOK_SECRET: whsec,
      }),
    ).toBe(`STRIPE_SECRET_KEY=${key}\nSTRIPE_WEBHOOK_SECRET=${whsec}\n`);
  });

  it("accepts a restricted sandbox key", () => {
    expect(
      functionsSecretFile({
        STRIPE_SECRET_KEY: "rk_test_x",
        STRIPE_WEBHOOK_SECRET: whsec,
      }),
    ).toContain("STRIPE_SECRET_KEY=rk_test_x\n");
  });

  it("returns null when no Stripe keys are set, so dev still starts", () => {
    expect(functionsSecretFile({})).toBeNull();
    expect(
      functionsSecretFile({ STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "" }),
    ).toBeNull();
  });

  it("refuses live and placeholder keys", () => {
    for (const bad of ["sk_live_abc", "sk_test_replace_me", "pk_test_abc"]) {
      expect(() =>
        functionsSecretFile({
          STRIPE_SECRET_KEY: bad,
          STRIPE_WEBHOOK_SECRET: whsec,
        }),
      ).toThrow(/sandbox/);
    }
  });

  it("refuses a missing or malformed webhook secret", () => {
    for (const bad of [undefined, "", "abc", "whsec_replace_me"]) {
      expect(() =>
        functionsSecretFile({
          STRIPE_SECRET_KEY: key,
          STRIPE_WEBHOOK_SECRET: bad,
        }),
      ).toThrow(/STRIPE_WEBHOOK_SECRET/);
    }
  });

  it("never puts a secret in its error messages", () => {
    try {
      functionsSecretFile({
        STRIPE_SECRET_KEY: "sk_live_secretvalue",
        STRIPE_WEBHOOK_SECRET: "whsec_secretvalue",
      });
    } catch (error) {
      expect(String(error)).not.toContain("secretvalue");
    }
  });
});

describe("webhookUrl", () => {
  it("points at the emulator's stripeWebhook Function", () => {
    expect(webhookUrl("demo-richertext")).toBe(
      "http://127.0.0.1:5001/demo-richertext/europe-west1/stripeWebhook",
    );
  });
});

describe("listenArgs", () => {
  it("forwards only the events the webhook handles", () => {
    expect(LISTEN_EVENTS).toEqual([
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ]);
    expect(listenArgs("demo-richertext")).toEqual([
      "listen",
      "--forward-to",
      "http://127.0.0.1:5001/demo-richertext/europe-west1/stripeWebhook",
      "--events",
      LISTEN_EVENTS.join(","),
    ]);
  });

  it("never carries the API key on the command line", () => {
    expect(listenArgs("demo-richertext").join(" ")).not.toMatch(
      /sk_|rk_|api-key/,
    );
  });
});

describe("redactSecrets", () => {
  it("hides the signing secret the Stripe CLI prints on start", () => {
    expect(
      redactSecrets(
        "> Ready! Your webhook signing secret is whsec_abc123XYZ (^C to quit)",
      ),
    ).toBe("> Ready! Your webhook signing secret is whsec_… (^C to quit)");
  });

  it("hides API keys too and leaves event lines alone", () => {
    expect(redactSecrets("key sk_test_abc and rk_test_def")).toBe(
      "key sk_test_… and rk_test_…",
    );
    const line =
      "2026-10-21 15:00:00   --> customer.subscription.created [evt_123]";
    expect(redactSecrets(line)).toBe(line);
  });
});
