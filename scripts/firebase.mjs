// Runs the project's local firebase-tools with Java 21+, which the emulators
// need, on macOS, Linux and Windows. If the default `java` is older, it uses a
// Java 21 found by scripts/java.mjs, for this command only.
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { findJavaHere } from "./java.mjs";

const require = createRequire(import.meta.url);
const pkgPath = require.resolve("firebase-tools/package.json");
const { bin } = JSON.parse(readFileSync(pkgPath, "utf8"));
const cli = path.join(path.dirname(pkgPath), bin.firebase);

const env = { ...process.env };
const found = findJavaHere();
if (found?.home) {
  env.JAVA_HOME = found.home;
  env.PATH = `${path.join(found.home, "bin")}${path.delimiter}${env.PATH ?? ""}`;
}

const child = spawn(process.execPath, [cli, ...process.argv.slice(2)], {
  stdio: "inherit",
  env,
});
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
