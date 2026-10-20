// @vitest-environment node
import { describe, expect, it } from "vitest";

import { findJava } from "../../scripts/java.mjs";

// The Firebase emulators need Java 21+. findJava looks for one without
// changing the system default; the file system and `java -version` are faked.
type Fake = {
  platform: NodeJS.Platform;
  env?: Record<string, string>;
  dirs?: Record<string, string[]>;
  javas: Record<string, number>; // java executable → major version
  commands?: Record<string, string>; // "cmd args" → stdout
};

function lookup(fake: Fake) {
  return findJava({
    platform: fake.platform,
    env: fake.env ?? {},
    listDir: (dir) => fake.dirs?.[dir] ?? [],
    isFile: (file) => file in fake.javas,
    javaMajor: (java) => fake.javas[java] ?? null,
    run: (cmd, args) => fake.commands?.[[cmd, ...args].join(" ")] ?? null,
  });
}

describe("findJava", () => {
  it("uses the java on PATH when it is 21 or newer", () => {
    expect(lookup({ platform: "darwin", javas: { java: 21 } })).toEqual({
      java: "java",
      home: null,
    });
  });

  it("uses JAVA_HOME when it points at Java 21+", () => {
    expect(
      lookup({
        platform: "linux",
        env: { JAVA_HOME: "/opt/jdk-25" },
        javas: { java: 17, "/opt/jdk-25/bin/java": 25 },
      }),
    ).toEqual({ java: "/opt/jdk-25/bin/java", home: "/opt/jdk-25" });
  });

  it("on macOS skips java_home's fallback to 17 and finds Homebrew's openjdk@21", () => {
    const brewHome =
      "/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home";
    expect(
      lookup({
        platform: "darwin",
        commands: {
          "/usr/libexec/java_home -v 21+":
            "/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home\n",
        },
        javas: {
          java: 17,
          "/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home/bin/java": 17,
          [`${brewHome}/bin/java`]: 21,
        },
      }),
    ).toEqual({ java: `${brewHome}/bin/java`, home: brewHome });
  });

  it("on Linux finds a JDK 21 under /usr/lib/jvm", () => {
    expect(
      lookup({
        platform: "linux",
        dirs: {
          "/usr/lib/jvm": ["java-17-openjdk-amd64", "java-21-openjdk-amd64"],
        },
        javas: {
          "/usr/lib/jvm/java-17-openjdk-amd64/bin/java": 17,
          "/usr/lib/jvm/java-21-openjdk-amd64/bin/java": 21,
        },
      }),
    ).toEqual({
      java: "/usr/lib/jvm/java-21-openjdk-amd64/bin/java",
      home: "/usr/lib/jvm/java-21-openjdk-amd64",
    });
  });

  it("on Windows finds the Microsoft build of OpenJDK 21", () => {
    const home = "C:\\Program Files\\Microsoft\\jdk-21.0.8.9-hotspot";
    expect(
      lookup({
        platform: "win32",
        env: { ProgramFiles: "C:\\Program Files" },
        dirs: { "C:\\Program Files\\Microsoft": ["jdk-21.0.8.9-hotspot"] },
        javas: { [`${home}\\bin\\java.exe`]: 21 },
      }),
    ).toEqual({ java: `${home}\\bin\\java.exe`, home });
  });

  it("returns null when there is no Java 21+", () => {
    expect(
      lookup({
        platform: "linux",
        dirs: { "/usr/lib/jvm": ["java-17-openjdk-amd64"] },
        javas: { java: 17, "/usr/lib/jvm/java-17-openjdk-amd64/bin/java": 17 },
      }),
    ).toBeNull();
  });
});
