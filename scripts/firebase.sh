#!/usr/bin/env bash
# Runs the project's local firebase-tools with Java 21+, which the emulators need.
# If the default `java` is older, it looks for a Java 21 installed alongside it
# (macOS java_home, Homebrew openjdk@21) without changing the system default.
set -euo pipefail

java_major() {
  "$1" -version 2>&1 | awk -F'"' '/version/ { split($2, v, "."); print v[1]; exit }'
}

if ! command -v java >/dev/null 2>&1 || [ "$(java_major java)" -lt 21 ]; then
  for candidate in \
    "$(/usr/libexec/java_home -v 21+ 2>/dev/null || true)" \
    "$(brew --prefix openjdk@21 2>/dev/null || true)/libexec/openjdk.jdk/Contents/Home" \
    "/usr/lib/jvm/java-21-openjdk" \
    "/usr/lib/jvm/java-21-openjdk-amd64" \
    "/usr/lib/jvm/java-21-openjdk-arm64"; do
    if [ -n "$candidate" ] && [ -x "$candidate/bin/java" ] &&
      [ "$(java_major "$candidate/bin/java")" -ge 21 ]; then
      export JAVA_HOME="$candidate"
      export PATH="$JAVA_HOME/bin:$PATH"
      break
    fi
  done
fi

exec pnpm exec firebase "$@"
