// @vitest-environment node
import { spawnSync } from "node:child_process";
import { accessSync, constants, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// ADR 0025: someone new runs one script, fills in .env.local, runs `pnpm dev:all`.
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

describe("hand-over setup (ADR 0025)", () => {
  it("pins the Node version in .nvmrc and package.json engines", () => {
    const nvmrc = readFileSync(".nvmrc", "utf8").trim();
    expect(nvmrc).toBe("22");
    expect(pkg.engines.node).toBe("22.x");
  });

  it("has one command to run everything and one to test on the emulators", () => {
    expect(pkg.scripts["dev:all"]).toBeTruthy();
    expect(pkg.scripts["test:emulators"]).toBeTruthy();
    expect(pkg.scripts["setup"]).toBe("bash scripts/setup.sh");
  });

  it("keeps firebase-tools local, not global", () => {
    expect(pkg.devDependencies["firebase-tools"]).toBeTruthy();
  });

  it("ships an executable setup script with valid syntax", () => {
    accessSync("scripts/setup.sh", constants.X_OK);
    const res = spawnSync("bash", ["-n", "scripts/setup.sh"]);
    expect(res.status).toBe(0);
  });

  it("reports every requirement in check mode without installing anything", () => {
    const res = spawnSync("bash", ["scripts/setup.sh", "--check"], {
      encoding: "utf8",
    });
    const out = res.stdout;
    for (const item of [
      "Node 22",
      "pnpm",
      "Java 21",
      "Stripe CLI",
      "Dependencies",
      "Playwright browsers",
      ".env.local",
    ]) {
      expect(out).toContain(item);
    }
    expect(out).not.toMatch(/Installing/);
  });

  it("documents every variable in .env.example with placeholders only", () => {
    const env = readFileSync(".env.example", "utf8");
    for (const key of [
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    ]) {
      expect(env).toMatch(new RegExp(`^${key}=`, "m"));
    }
    expect(env).not.toMatch(/sk_test_[A-Za-z0-9]{10,}/);
    expect(env).not.toMatch(/whsec_[A-Za-z0-9]{10,}/);
  });

  it("explains the steps in the README", () => {
    const readme = readFileSync("README.md", "utf8");
    expect(readme).toContain("bash scripts/setup.sh");
    expect(readme).toContain(".env.local");
    expect(readme).toContain("pnpm dev:all");
  });
});
