// Local deploy to the real project (ADR 0018, 0034). No auto-deploys: run
//   pnpm deploy:prod [rules] [functions] [app] [--dry-run]
// from a clean main. Every check runs first; then rules, functions and the
// app deploy in that order, so the rules already allow what new code writes.
import { execFileSync, spawnSync } from "node:child_process";
import { createConnection } from "node:net";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const TARGETS = ["rules", "functions", "app"];
const EMULATOR_ENV = {
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FUNCTIONS_EMULATOR_HOST: "127.0.0.1:5001",
  FIREBASE_EMULATOR_HUB: "127.0.0.1:4400",
  GCLOUD_PROJECT: "demo-richertext",
};

export function parseArgs(argv) {
  const named = new Set();
  let dryRun = false;
  for (const arg of argv) {
    if (arg === "--dry-run") dryRun = true;
    else if (TARGETS.includes(arg)) named.add(arg);
    else throw new Error(`Unknown target or flag: ${arg}`);
  }
  const targets = named.size
    ? TARGETS.filter((t) => named.has(t))
    : [...TARGETS];
  return { targets, dryRun };
}

export function preflightProblems({ branch, dirty }) {
  const problems = [];
  if (branch !== "main") problems.push(`Deploy from main, not ${branch}.`);
  if (dirty) problems.push("Commit or stash the uncommitted changes first.");
  return problems;
}

// Checked again right before every deploy step: the checks take minutes, and
// a branch switch or an edit meanwhile would ship code they never tested.
export function driftProblems(start, now) {
  const problems = preflightProblems(now);
  if (now.head !== start.head) {
    problems.push(
      `main moved from ${start.head} to ${now.head} during the run.`,
    );
  }
  return problems;
}

// `pnpm dev:all` already holds the emulator ports, so the checks reuse those
// emulators instead of starting a second set. e2e runs as CI: a fresh build,
// no .only, one retry for the known load flakes.
export function checkSteps({ emulatorsRunning }) {
  const pnpm = (name, args, env) => ({ name, cmd: "pnpm", args, env });
  return [
    pnpm("lint", ["lint"]),
    pnpm("types", ["typecheck"]),
    pnpm("format", ["format:check"]),
    pnpm("unit", ["test"]),
    emulatorsRunning
      ? pnpm(
          "emulator",
          ["exec", "vitest", "run", "--config", "vitest.emulators.config.mts"],
          EMULATOR_ENV,
        )
      : pnpm("emulator", ["test:emulators"]),
    emulatorsRunning
      ? pnpm("e2e", ["exec", "playwright", "test"], {
          ...EMULATOR_ENV,
          CI: "1",
        })
      : pnpm("e2e", ["test:e2e"], { CI: "1" }),
  ];
}

const ONLY = {
  rules: "firestore:rules,firestore:indexes",
  functions: "functions",
  app: "apphosting",
};

export function deploySteps(targets) {
  return targets.map((name) => ({
    name,
    cmd: "node",
    args: ["deploy", "--only", ONLY[name], "--project", "prod"],
  }));
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function git(...args) {
  return execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
}

function portOpen(port) {
  return new Promise((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.end();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

function run(step) {
  // Firebase commands go through the project's own firebase-tools.
  const args =
    step.cmd === "node" ? ["scripts/firebase.mjs", ...step.args] : step.args;
  process.stdout.write(`\n▶ ${step.name}: ${step.cmd} ${args.join(" ")}\n`);
  const result = spawnSync(step.cmd, args, {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...step.env },
  });
  if (result.status !== 0) throw new Error(`${step.name} failed; stopped.`);
}

function repoState() {
  return {
    branch: git("branch", "--show-current"),
    dirty: git("status", "--porcelain") !== "",
    head: git("rev-parse", "--short", "HEAD"),
  };
}

async function main() {
  const { targets, dryRun } = parseArgs(process.argv.slice(2));
  const start = repoState();
  const problems = preflightProblems(start);
  if (problems.length) throw new Error(problems.join("\n"));
  const checks = checkSteps({ emulatorsRunning: await portOpen(8080) });
  const deploys = deploySteps(targets);
  if (dryRun) {
    for (const s of [...checks, ...deploys])
      process.stdout.write(`${s.name}: ${s.args.join(" ")}\n`);
    return;
  }
  for (const step of checks) run(step);
  for (const step of deploys) {
    const drift = driftProblems(start, repoState());
    if (drift.length)
      throw new Error(`Stopped before ${step.name}:\n${drift.join("\n")}`);
    run(step);
  }
  process.stdout.write(`\nDeployed ${targets.join(", ")} at ${start.head}.\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`${error.message}\n`);
    process.exit(1);
  });
}
