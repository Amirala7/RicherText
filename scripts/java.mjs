// Finds a Java 21+ for the Firebase emulators without changing the system
// default (ADR 0025). Used by scripts/firebase.mjs and both setup scripts.
//
//   node scripts/java.mjs   # prints the java path, or exits 1 if there is none
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function findJava({ platform, env, listDir, isFile, javaMajor, run }) {
  const p = platform === "win32" ? path.win32 : path.posix;
  const exe = platform === "win32" ? "java.exe" : "java";
  const recent = (java) => (javaMajor(java) ?? 0) >= 21;

  if (recent("java")) return { java: "java", home: null };

  const homes = [];
  if (env.JAVA_HOME) homes.push(env.JAVA_HOME);
  const under = (dir, suffix = "") =>
    listDir(dir).map((name) => p.join(dir, name, suffix));

  if (platform === "darwin") {
    const javaHome = run("/usr/libexec/java_home", ["-v", "21+"]);
    if (javaHome) homes.push(javaHome.trim());
    for (const prefix of ["/opt/homebrew", "/usr/local"]) {
      homes.push(`${prefix}/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home`);
    }
    homes.push(...under("/Library/Java/JavaVirtualMachines", "Contents/Home"));
  } else if (platform === "win32") {
    const programFiles = env.ProgramFiles ?? "C:\\Program Files";
    for (const vendor of ["Microsoft", "Eclipse Adoptium", "Java"]) {
      homes.push(...under(p.join(programFiles, vendor)));
    }
  } else {
    homes.push(...under("/usr/lib/jvm"));
  }

  for (const home of homes) {
    const java = p.join(home, "bin", exe);
    if (isFile(java) && recent(java)) return { java, home };
  }
  return null;
}

export function findJavaHere() {
  return findJava({
    platform: process.platform,
    env: process.env,
    listDir: (dir) => {
      try {
        return readdirSync(dir).sort().reverse();
      } catch {
        return [];
      }
    },
    isFile: (file) => existsSync(file) && statSync(file).isFile(),
    javaMajor: (java) => {
      const res = spawnSync(java, ["-version"], { encoding: "utf8" });
      const match = /version "(\d+)(?:\.(\d+))?/.exec(res.stderr ?? "");
      if (!match) return null;
      // Java 8 and older report "1.8".
      return match[1] === "1" ? Number(match[2]) : Number(match[1]);
    },
    run: (cmd, args) => {
      const res = spawnSync(cmd, args, { encoding: "utf8" });
      return res.status === 0 ? res.stdout : null;
    },
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const found = findJavaHere();
  if (!found) process.exit(1);
  console.log(found.java);
}
