// @vitest-environment node
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// ADR 0025: setup and the run/test commands work on macOS, Linux and Windows.
const pkg = JSON.parse(readFileSync("package.json", "utf8"));

describe("cross-platform setup (ADR 0025)", () => {
  it("runs Firebase through the Node wrapper, not bash, so Windows works", () => {
    for (const name of ["dev:all", "emulators", "test:emulators"]) {
      expect(pkg.scripts[name]).toContain("node scripts/firebase.mjs");
      expect(pkg.scripts[name]).not.toMatch(/\bbash\b/);
    }
  });

  it("ships a PowerShell setup for Windows with a check-only mode", () => {
    const ps = readFileSync("scripts/setup.ps1", "utf8");
    expect(ps).toMatch(/\[switch\]\s*\$Check/);
    for (const item of [
      "Node 22",
      "pnpm",
      "Java 21",
      "Stripe CLI",
      "Dependencies",
      "Playwright browsers",
      ".env.local",
    ]) {
      expect(ps).toContain(item);
    }
    for (const id of [
      "Schniz.fnm",
      "Microsoft.OpenJDK.21",
      "Stripe.StripeCli",
    ]) {
      expect(ps).toContain(id);
    }
  });

  it("installs the Linux system tools with apt, dnf or pacman", () => {
    const sh = readFileSync("scripts/setup.sh", "utf8");
    for (const pm of ["apt-get", "dnf", "pacman"]) {
      expect(sh).toContain(pm);
    }
  });

  it("gives the Windows command in the README", () => {
    const readme = readFileSync("README.md", "utf8");
    expect(readme).toContain("scripts\\setup.ps1");
  });
});
