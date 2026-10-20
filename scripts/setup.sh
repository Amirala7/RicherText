#!/usr/bin/env bash
# One-command local setup (ADR 0025).
#
#   bash scripts/setup.sh           # or: pnpm run setup (plain `pnpm setup` is pnpm's own command)
#   bash scripts/setup.sh --check   # only report what is there; install nothing
#
# Installs what RicherText needs to run locally on the Firebase emulators:
# Node 22, pnpm, Java 21 (the emulators run on it), the Stripe CLI (payments),
# the project's dependencies, the Playwright test browser, and a .env.local.
# System tools come from Homebrew on macOS and from apt, dnf or pacman on Linux
# (Node through nvm, the Stripe CLI into ~/.local/bin). Windows: scripts/setup.ps1.
set -euo pipefail

cd "$(dirname "$0")/.."

CHECK_ONLY=false
[ "${1:-}" = "--check" ] && CHECK_ONLY=true

OS="$(uname -s)"
START_PATH="$PATH"
MISSING=0

bold() { printf '\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
missing() { printf '  \033[31m✗\033[0m %s\n' "$*"; MISSING=$((MISSING + 1)); }
step() { printf '\n\033[1m%s\033[0m\n' "$*"; }
say() { printf '    %s\n' "$*"; }

java_major() {
  "$1" -version 2>&1 | awk -F'"' '/version/ { split($2, v, "."); print v[1]; exit }'
}

# Same lookup as scripts/firebase.mjs (scripts/java.mjs), so "found here" means
# "the emulators can use it". Without Node yet, only the java on PATH counts.
find_java21() {
  if command -v node >/dev/null 2>&1; then
    node scripts/java.mjs 2>/dev/null || true
  elif command -v java >/dev/null 2>&1 && [ "$(java_major java)" -ge 21 ]; then
    command -v java
  fi
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
  if has_stripe; then ok "Stripe CLI ($(stripe --version 2>/dev/null))"; else missing "Stripe CLI: forwards payment webhooks to the emulators"; fi
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

if [ "$(id -u)" -eq 0 ]; then SUDO=""; else SUDO="sudo"; fi

linux_pm() {
  if command -v apt-get >/dev/null 2>&1; then echo apt-get
  elif command -v dnf >/dev/null 2>&1; then echo dnf
  elif command -v pacman >/dev/null 2>&1; then echo pacman
  fi
}

# Installs Linux packages; the names differ per package manager: apt-get dnf pacman.
linux_install() {
  case "$(linux_pm)" in
    apt-get) $SUDO apt-get update -qq && $SUDO apt-get install -y "$1" ;;
    dnf) $SUDO dnf install -y "$2" ;;
    pacman) $SUDO pacman -S --needed --noconfirm "$3" ;;
    *) manual "$4" "Install it with your distribution's package manager." ;;
  esac
}

need_curl() {
  command -v curl >/dev/null 2>&1 || linux_install curl curl curl "curl"
}

# nvm doesn't work under `set -eu`, so it runs with them off.
use_nvm() {
  export NVM_DIR="$1"
  set +eu
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm install && nvm use
  local status=$?
  set -eu
  [ "$status" -eq 0 ] || exit "$status"
}

# Fallback for systems the script can't install on: print what to do and stop.
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
if [ "$OS" = "Darwin" ]; then
  say "System tools are installed with Homebrew."
elif [ -n "$(linux_pm)" ]; then
  say "System tools are installed with $(linux_pm); you may be asked for your password (sudo)."
fi

if ! has_node22; then
  step "Installing Node 22"
  if [ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]; then
    say "Using nvm (found on this machine) and the version in .nvmrc."
    use_nvm "${NVM_DIR:-$HOME/.nvm}"
  elif [ "$OS" = "Darwin" ]; then
    need_brew
    brew install node@22
    export PATH="$(brew --prefix node@22)/bin:$PATH"
    say "Add Node 22 to your shell so new terminals find it:"
    say "echo 'export PATH=\"$(brew --prefix node@22)/bin:\$PATH\"' >> ~/.zshrc"
  else
    say "Installing nvm (Node version manager), then Node 22 with it."
    need_curl
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.8/install.sh | bash
    use_nvm "$HOME/.nvm"
    say "nvm added itself to your shell profile; new terminals find Node 22."
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
    linux_install openjdk-21-jre-headless java-21-openjdk-headless jre21-openjdk-headless "Java 21"
  fi
fi

if ! has_stripe; then
  step "Installing the Stripe CLI (only used for payment flows)"
  if [ "$OS" = "Darwin" ]; then
    need_brew
    brew install stripe/stripe-cli/stripe
  else
    case "$(uname -m)" in
      x86_64 | amd64) arch=x86_64 ;;
      aarch64 | arm64) arch=arm64 ;;
      *) manual "the Stripe CLI" "See https://docs.stripe.com/stripe-cli#install" ;;
    esac
    need_curl
    version="$(curl -fsSL https://api.github.com/repos/stripe/stripe-cli/releases/latest |
      sed -n 's/.*"tag_name": *"v\([^"]*\)".*/\1/p' | head -n 1)"
    say "Downloading Stripe CLI $version into ~/.local/bin"
    mkdir -p "$HOME/.local/bin"
    curl -fsSL "https://github.com/stripe/stripe-cli/releases/download/v$version/stripe_${version}_linux_$arch.tar.gz" |
      tar -xz -C "$HOME/.local/bin" stripe
    export PATH="$HOME/.local/bin:$PATH"
    case ":$START_PATH:" in
      *":$HOME/.local/bin:"*) ;;
      *)
        say "Add it to your shell so new terminals find it:"
        say "echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc"
        ;;
    esac
  fi
fi

if ! has_deps; then
  step "Installing the project's dependencies (pnpm install)"
  pnpm install
fi

if ! has_browser; then
  step "Installing the Playwright test browser (Chromium)"
  if [ "$(linux_pm)" = "apt-get" ]; then
    say "Also installs the system libraries Chromium needs (sudo)."
    pnpm exec playwright install --with-deps chromium
  else
    pnpm exec playwright install chromium
    [ "$OS" = "Linux" ] && say "If the browser fails to start, see https://playwright.dev/docs/intro#system-requirements"
  fi
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
