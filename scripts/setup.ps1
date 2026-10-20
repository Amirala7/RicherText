# One-command local setup for Windows (ADR 0025). macOS and Linux: scripts/setup.sh.
#
#   powershell -ExecutionPolicy Bypass -File scripts\setup.ps1          # install what's missing
#   powershell -ExecutionPolicy Bypass -File scripts\setup.ps1 -Check   # only report; install nothing
#
# Installs what RicherText needs to run locally on the Firebase emulators:
# Node 22 (through fnm, or nvm-windows if you already use it), pnpm, Java 21
# (the emulators run on it), the Stripe CLI (payments), the project's
# dependencies, the Playwright test browser, and a .env.local.
# System tools come from winget, which ships with Windows 10 and 11.
param([switch]$Check)

$ErrorActionPreference = "Stop"
Set-Location (Split-Path -Parent $PSScriptRoot)

$script:Missing = 0

function Bold($text) { Write-Host $text -ForegroundColor White }
function Ok($text) { Write-Host "  " -NoNewline; Write-Host "OK" -ForegroundColor Green -NoNewline; Write-Host " $text" }
function Miss($text) { Write-Host "  " -NoNewline; Write-Host "--" -ForegroundColor Red -NoNewline; Write-Host " $text"; $script:Missing++ }
function Step($text) { Write-Host ""; Write-Host $text -ForegroundColor White }
function Say($text) { Write-Host "    $text" }

function Has($command) { [bool](Get-Command $command -ErrorAction SilentlyContinue) }

# winget changes PATH for new terminals; pick it up in this one too.
function Refresh-Path {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = "$machine;$user"
}

function Run($command, [string[]]$arguments) {
  & $command @arguments
  if ($LASTEXITCODE -ne 0) { throw "'$command $arguments' failed with exit code $LASTEXITCODE" }
}

function Winget-Install($id, $what) {
  if (-not (Has "winget")) {
    Step "winget is needed to install $what."
    Say "Install 'App Installer' from the Microsoft Store, open a new terminal, then run this script again."
    exit 1
  }
  Run "winget" @("install", "--id", $id, "--exact", "--silent", "--accept-package-agreements", "--accept-source-agreements")
  Refresh-Path
}

function Node-Major {
  if (-not (Has "node")) { return $null }
  return (& node -p "process.versions.node.split('.')[0]")
}

# Same lookup as scripts/firebase.mjs (scripts/java.mjs), so "found here" means
# "the emulators can use it".
function Find-Java21 {
  if (-not (Has "node")) { return $null }
  $java = & node scripts/java.mjs 2>$null
  if ($LASTEXITCODE -eq 0) { return $java }
  return $null
}

function Has-Node22 { (Node-Major) -eq "22" }
function Has-Pnpm { Has "pnpm" }
function Has-Java21 { [bool](Find-Java21) }
function Has-Stripe { Has "stripe" }
function Has-Deps { (Test-Path "node_modules/.modules.yaml") -and (Test-Path "functions/node_modules") }
function Has-Browser {
  if (-not (Has-Deps)) { return $false }
  & node -e "const fs = require('fs'); const { chromium } = require('@playwright/test'); process.exit(fs.existsSync(chromium.executablePath()) ? 0 : 1)" 2>$null
  return $LASTEXITCODE -eq 0
}
function Has-Env { Test-Path ".env.local" }

function Report {
  Bold "RicherText local setup: what's needed"
  if (Has-Node22) { Ok "Node 22 ($(node -v))" } else { Miss "Node 22: runs the app, tests and tooling" }
  if (Has-Pnpm) { Ok "pnpm ($(pnpm -v))" } else { Miss "pnpm: the package manager" }
  if (Has-Java21) { Ok "Java 21 ($(Find-Java21))" } else { Miss "Java 21: the Firebase emulators run on it" }
  if (Has-Stripe) { Ok "Stripe CLI ($(stripe --version))" } else { Miss "Stripe CLI: forwards payment webhooks to the emulators" }
  if (Has-Deps) { Ok "Dependencies (pnpm install)" } else { Miss "Dependencies: the project's packages, incl. the Firebase CLI" }
  if (Has-Browser) { Ok "Playwright browsers (Chromium)" } else { Miss "Playwright browsers: Chromium for the end-to-end tests" }
  if (Has-Env) { Ok ".env.local" } else { Miss ".env.local: local settings, created from .env.example" }
}

Report

if ($Check) {
  Write-Host ""
  if ($script:Missing -eq 0) {
    Bold "Everything is in place."
    exit 0
  }
  Bold "$($script:Missing) item(s) missing. Run 'powershell -ExecutionPolicy Bypass -File scripts\setup.ps1' to install them."
  exit 1
}

if ($script:Missing -eq 0) {
  Write-Host ""
  Bold "Everything is in place. Start the app with: pnpm dev:all"
  exit 0
}

Write-Host ""
Bold "The items marked -- will be installed now, one by one."
Say "System tools are installed with winget; Windows may ask you to allow each one."

if (-not (Has-Node22)) {
  Step "Installing Node 22"
  if (Has "nvm") {
    Say "Using nvm-windows (found on this machine)."
    Run "nvm" @("install", "22")
    Run "nvm" @("use", "22")
    Refresh-Path
  } else {
    Say "Installing fnm (Node version manager), then Node 22 with it."
    if (-not (Has "fnm")) { Winget-Install "Schniz.fnm" "fnm" }
    fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression
    Run "fnm" @("install", "22")
    Run "fnm" @("use", "22")
    $hook = "fnm env --use-on-cd --shell powershell | Out-String | Invoke-Expression"
    if (-not (Test-Path $PROFILE)) { New-Item -ItemType File -Path $PROFILE -Force | Out-Null }
    if (-not (Select-String -Path $PROFILE -SimpleMatch $hook -Quiet)) {
      Add-Content -Path $PROFILE -Value $hook
      Say "Added fnm to your PowerShell profile ($PROFILE), so new terminals find Node 22."
    }
  }
}

if (-not (Has-Pnpm)) {
  Step "Installing pnpm (through corepack, which comes with Node)"
  Run "corepack" @("enable")
  Run "corepack" @("prepare", "--activate")
}

if (-not (Has-Java21)) {
  Step "Installing Java 21 (the Firebase emulators need it)"
  Winget-Install "Microsoft.OpenJDK.21" "Java 21"
  Say "If you had an older default 'java', it stays; the project's scripts find Java 21 on their own."
}

if (-not (Has-Stripe)) {
  Step "Installing the Stripe CLI (only used for payment flows)"
  Winget-Install "Stripe.StripeCli" "the Stripe CLI"
}

if (-not (Has-Deps)) {
  Step "Installing the project's dependencies (pnpm install)"
  Run "pnpm" @("install")
}

if (-not (Has-Browser)) {
  Step "Installing the Playwright test browser (Chromium)"
  Run "pnpm" @("exec", "playwright", "install", "chromium")
}

if (-not (Has-Env)) {
  Step "Creating .env.local from .env.example"
  Copy-Item ".env.example" ".env.local"
  Say "Fill in the Stripe sandbox keys in .env.local when you work on payments."
  Say "Everything else already works with the values in it."
}

Write-Host ""
$script:Missing = 0
Report
Write-Host ""
if ($script:Missing -eq 0) {
  Bold "Done. Start the app with: pnpm dev:all"
  Say "App: http://localhost:3000    Emulator UI: http://localhost:4000"
  Say "Open a new terminal first if 'node' or 'pnpm' isn't found."
} else {
  Bold "Something is still missing; see the -- items above."
  exit 1
}
