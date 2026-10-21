export type Target = "rules" | "functions" | "app";

export type Step = {
  name: string;
  cmd: string;
  args: string[];
  env?: Record<string, string>;
};

export function parseArgs(argv: string[]): {
  targets: Target[];
  dryRun: boolean;
};

export function preflightProblems(state: {
  branch: string;
  dirty: boolean;
}): string[];

export function checkSteps(state: { emulatorsRunning: boolean }): Step[];

export function deploySteps(targets: Target[]): Step[];
