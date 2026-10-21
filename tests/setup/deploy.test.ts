import { describe, expect, it } from "vitest";
import {
  checkSteps,
  deploySteps,
  parseArgs,
  preflightProblems,
} from "../../scripts/deploy.mjs";

// Local deploy script (ADR 0018, 0034): only from a clean main, all checks
// first, then rules, functions and the app, each on its own if asked.

describe("parseArgs", () => {
  it("deploys everything when no target is named", () => {
    expect(parseArgs([])).toEqual({
      targets: ["rules", "functions", "app"],
      dryRun: false,
    });
  });

  it("deploys only the named targets, always in the safe order", () => {
    expect(parseArgs(["app", "rules"]).targets).toEqual(["rules", "app"]);
    expect(parseArgs(["functions"]).targets).toEqual(["functions"]);
  });

  it("reads --dry-run", () => {
    expect(parseArgs(["--dry-run", "app"])).toEqual({
      targets: ["app"],
      dryRun: true,
    });
  });

  it("refuses an unknown target or flag", () => {
    expect(() => parseArgs(["hosting"])).toThrow(/hosting/);
    expect(() => parseArgs(["--skip-checks"])).toThrow(/--skip-checks/);
  });
});

describe("preflightProblems", () => {
  it("has none on a clean main", () => {
    expect(preflightProblems({ branch: "main", dirty: false })).toEqual([]);
  });

  it("refuses another branch", () => {
    expect(
      preflightProblems({ branch: "feat/x", dirty: false }).join(" "),
    ).toMatch(/main/);
  });

  it("refuses uncommitted changes", () => {
    expect(
      preflightProblems({ branch: "main", dirty: true }).join(" "),
    ).toMatch(/uncommitted/);
  });
});

describe("checkSteps", () => {
  const names = (steps: { name: string }[]) => steps.map((s) => s.name);
  const ALL = ["lint", "types", "format", "unit", "emulator", "e2e"];

  it("runs every check, starting its own emulators when none run", () => {
    const steps = checkSteps({ emulatorsRunning: false });
    expect(names(steps)).toEqual(ALL);
    expect(steps.find((s) => s.name === "emulator")?.args).toEqual([
      "test:emulators",
    ]);
    expect(steps.find((s) => s.name === "e2e")?.args).toEqual(["test:e2e"]);
  });

  it("uses the running dev emulators instead of starting a second set", () => {
    const steps = checkSteps({ emulatorsRunning: true });
    expect(names(steps)).toEqual(ALL);
    for (const name of ["emulator", "e2e"]) {
      const step = steps.find((s) => s.name === name);
      expect(step?.env?.FIRESTORE_EMULATOR_HOST).toBe("127.0.0.1:8080");
      expect(step?.env?.FIREBASE_AUTH_EMULATOR_HOST).toBe("127.0.0.1:9099");
    }
  });
});

describe("deploySteps", () => {
  it("deploys each target to the prod project only", () => {
    const steps = deploySteps(["rules", "functions", "app"]);
    expect(steps.map((s) => s.args)).toEqual([
      [
        "deploy",
        "--only",
        "firestore:rules,firestore:indexes",
        "--project",
        "prod",
      ],
      ["deploy", "--only", "functions", "--project", "prod"],
      ["deploy", "--only", "apphosting", "--project", "prod"],
    ]);
  });

  it("deploys just what was asked", () => {
    expect(deploySteps(["app"]).map((s) => s.name)).toEqual(["app"]);
  });
});
