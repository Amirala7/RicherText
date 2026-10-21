// Local Stripe wiring for the real sandbox run (ADR 0027 slice 4). Reads the
// Stripe values from .env.local and never prints them.
//
//   pnpm stripe:secrets   writes functions/.secret.local for the Functions
//                         emulator (dev:all runs it; skipped without keys)
//   pnpm stripe:listen    forwards sandbox events to the emulator's webhook
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { assertSandboxKey } from "./stripe-setup.mjs";

// The events the webhook handles (functions/src/billing/webhook.ts).
export const LISTEN_EVENTS = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

// The contents of functions/.secret.local, or null when no Stripe keys are
// set (payments are optional for local work).
export function functionsSecretFile(env) {
  const key = env.STRIPE_SECRET_KEY;
  const whsec = env.STRIPE_WEBHOOK_SECRET;
  if (!key && !whsec) return null;
  assertSandboxKey(key);
  if (!whsec || !/^whsec_/.test(whsec) || whsec.includes("replace_me")) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET must be the whsec_… value from `stripe listen --print-secret`",
    );
  }
  return `STRIPE_SECRET_KEY=${key}\nSTRIPE_WEBHOOK_SECRET=${whsec}\n`;
}

export function webhookUrl(projectId) {
  return `http://127.0.0.1:5001/${projectId}/us-central1/stripeWebhook`;
}

// The API key goes in the environment (STRIPE_API_KEY), never in the
// arguments, where other processes could read it.
export function listenArgs(projectId) {
  return [
    "listen",
    "--forward-to",
    webhookUrl(projectId),
    "--events",
    LISTEN_EVENTS.join(","),
  ];
}

// The Stripe CLI prints its signing secret on start; logs never carry
// secrets (ADR 0026), so its output passes through this.
export function redactSecrets(text) {
  return text.replace(
    /\b(whsec_|(?:sk|rk|pk)_(?:test|live)_)[A-Za-z0-9]+/g,
    "$1…",
  );
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function projectId() {
  const rc = JSON.parse(readFileSync(path.join(root, ".firebaserc"), "utf8"));
  return rc.projects.default;
}

function writeSecrets() {
  const file = functionsSecretFile(process.env);
  if (!file) {
    process.stdout.write(
      "No Stripe keys in .env.local; the payments webhook is off.\n",
    );
    return;
  }
  writeFileSync(path.join(root, "functions", ".secret.local"), file, {
    mode: 0o600,
  });
  process.stdout.write("Wrote functions/.secret.local from .env.local.\n");
}

function listen() {
  assertSandboxKey(process.env.STRIPE_SECRET_KEY);
  const child = spawn("stripe", listenArgs(projectId()), {
    stdio: ["inherit", "pipe", "pipe"],
    env: { ...process.env, STRIPE_API_KEY: process.env.STRIPE_SECRET_KEY },
  });
  for (const [from, to] of [
    [child.stdout, process.stdout],
    [child.stderr, process.stderr],
  ]) {
    createInterface({ input: from }).on("line", (line) =>
      to.write(`${redactSecrets(line)}\n`),
    );
  }
  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => child.kill(signal));
  }
  child.on("exit", (code) => process.exit(code ?? 1));
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    if (process.argv[2] === "secrets") writeSecrets();
    else if (process.argv[2] === "listen") listen();
    else throw new Error("Usage: stripe-local.mjs secrets|listen");
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  }
}
