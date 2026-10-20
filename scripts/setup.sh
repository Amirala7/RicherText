#!/usr/bin/env bash
# One-command local setup (ADR 0025).
#
#   bash scripts/setup.sh           # or: pnpm run setup (plain `pnpm setup` is pnpm's own command)
#   bash scripts/setup.sh --check   # only report what is there; install nothing
#
# Installs what RicherText needs to run locally on the Firebase emulators:
# Node 22, pnpm, Java 21 (the emulators run on it), the Stripe CLI (payments),
# the project's dependencies, the Playwright test browser, and a .env.local.
# Installs system tools with Homebrew on macOS; on Linux it prints the commands.
set -euo pipefail

cd "$(dirname "$0")/.."

CHECK_ONLY=false
[ "${1:-}" = "--check" ] && CHECK_ONLY=true

OS="$(uname -s)"
MISSING=0

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
missing() { printf '  \033[31m✗\033[0m %s\n' "$*"; MISSING=$((MISSING + 1)); }
step() { printf '\n\033[1m%s\033[0m\n' "$*"; }
say() { printf '    %s\n' "$*"; }

java_major() {
  "$1" -version 2>&1 | awk -F'"' '/version/ { split($2, v, "."); print v[1]; exit }'
}

# The same lookup scripts/firebase.sh uses, so "found here" means "the emulators can use it".
find_java21() {
  if command -v java >/dev/null 2>&1 && [ "$(java_major java)" -ge 21 ]; then
    command -v java
    return
  fi
  local candidate
  for candidate in \
    "$(/usr/libexec/java_home -v 21+ 2>/dev/null || true)" \
    "$(brew --prefix openjdk@21 2>/dev/null || true)/libexec/openjdk.jdk/Contents/Home" \
    "/usr/lib/jvm/java-21-openjdk" \
    "/usr/lib/jvm/java-21-openjdk-amd64" \
    "/usr/lib/jvm/java-21-openjdk-arm64"; do
    if [ -n "$candidate" ] && [ -x "$candidate/bin/java" ] &&
      [ "$(java_major "$candidate/bin/java")" -ge 21 ]; then
      echo "$candidate/bin/java"
      return
    fi
  done
}

has_node22() { command -v node >/dev/null 2>&1 && [ "$(node -p 'process.versions.node.split(".")[0]')" = "22" ]; }
has_pnpm() { command -v pnpm >/dev/null 2>&1; }
has_java21() { [ -n "$(find_java21)" ]; }
has_stripe() { command -v stripe >/dev/null 2>&1; }
has_deps() { [ -f node_modules/.modules.yaml ] && [ -d functions/node_modules ]; }
has_browser() {
  has_deps && node -e "
    const fs = require('fs');
    const { chromium } = require('@playwright/test');
    process.exit(fs.existsSync(chromium.executablePath()) ? 0 : 1);
  " 2>/dev/null
}
has_env() { [ -f .env.local ]; }

report() {
  bold "RicherText local setup: what's needed"
  if has_node22; then ok "Node 22 ($(node -v))"; else missing "Node 22: runs the app, tests and tooling"; fi
  if has_pnpm; then ok "pnpm ($(pnpm -v))"; else missing "pnpm: the package manager"; fi
  if has_java21; then ok "Java 21 ($(find_java21))"; else missing "Java 21: the Firebase emulators run on it"; fi
  if has_stripe; then ok "Stripe CLI ($(stripe --version))"; else missing "Stripe CLI: forwards payment webhooks to the emulators"; fi
  if has_deps; then ok "Dependencies (pnpm install)"; else missing "Dependencies: the project's packages, incl. the Firebase CLI"; fi
  if has_browser; then ok "Playwright browsers (Chromium)"; else missing "Playwright browsers: Chromium for the end-to-end tests"; fi
  if has_env; then ok ".env.local"; else missing ".env.local: local settings, created from .env.example"; fi
}

need_brew() {
  if [ "$OS" = "Darwin" ] && ! command -v brew >/dev/null 2>&1; then
    step "Homebrew is needed to install the system tools on macOS."
    say "Install it from https://brew.sh, open a new terminal, then run this script again:"
    say '/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"'
    exit 1
  fi
}

# On Linux we don't guess the package manager: print the command and stop.
manual() {
  step "Please install $1 yourself, then run this script again:"
  say "$2"
  exit 1
}

report

if $CHECK_ONLY; then
  echo
  if [ "$MISSING" -eq 0 ]; then bold "Everything is in place."; else bold "$MISSING item(s) missing. Run 'bash scripts/setup.sh' to install them."; fi
  [ "$MISSING" -eq 0 ]
  exit
fi

if [ "$MISSING" -eq 0 ]; then
  echo
  bold "Everything is in place. Start the app with: pnpm dev:all"
  exit 0
fi

echo
bold "The items marked ✗ will be installed now, one by one."
[ "$OS" = "Darwin" ] && say "System tools are installed with Homebrew."

if ! has_node22; then
  step "Installing Node 22"
  if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
    say "Using nvm (found on this machine) and the version in .nvmrc."
    # shellcheck disable=SC1091
    . "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
    nvm install
    nvm use
  elif [ "$OS" = "Darwin" ]; then
    need_brew
    brew install node@22
    export PATH="$(brew --prefix node@22)/bin:$PATH"
    say "Add Node 22 to your shell so new terminals find it:"
    say "echo 'export PATH=\"$(brew --prefix node@22)/bin:\$PATH\"' >> ~/.zshrc"
  else
    manual "Node 22" "See https://nodejs.org/en/download (or use nvm: https://github.com/nvm-sh/nvm)"
  fi
fi

if ! has_pnpm; then
  step "Installing pnpm (through corepack, which comes with Node)"
  corepack enable
  corepack prepare --activate
fi

if ! has_java21; then
  step "Installing Java 21 (the Firebase emulators need it)"
  if [ "$OS" = "Darwin" ]; then
    need_brew
    brew install openjdk@21
    say "Your default 'java' is left as it is; the project's scripts find Java 21 on their own."
  else
    manual "Java 21" "sudo apt install openjdk-21-jre-headless   (Debian/Ubuntu; or your distribution's OpenJDK 21 package)"
  fi
fi

if ! has_stripe; then
  step "Installing the Stripe CLI (only used for payment flows)"
  if [ "$OS" = "Darwin" ]; then
    need_brew
    brew install stripe/stripe-cli/stripe
  else
    manual "the Stripe CLI" "See https://docs.stripe.com/stripe-cli#install"
  fi
fi

if ! has_deps; then
  step "Installing the project's dependencies (pnpm install)"
  pnpm install
fi

if ! has_browser; then
  step "Installing the Playwright test browser (Chromium)"
  pnpm exec playwright install chromium
fi

if ! has_env; then
  step "Creating .env.local from .env.example"
  cp .env.example .env.local
  say "Fill in the Stripe sandbox keys in .env.local when you work on payments."
  say "Everything else already works with the values in it."
fi

echo
MISSING=0
report
echo
if [ "$MISSING" -eq 0 ]; then
  bold "Done. Start the app with: pnpm dev:all"
  say "App: http://localhost:3000    Emulator UI: http://localhost:4000"
else
  bold "Something is still missing; see the ✗ items above."
  exit 1
fi
