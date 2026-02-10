#!/usr/bin/env bash
set -euo pipefail

# ── Colors ────────────────────────────────────────────────
bold() { printf "\033[1m%s\033[0m" "$1"; }
green() { printf "\033[32m%s\033[0m" "$1"; }
yellow() { printf "\033[33m%s\033[0m" "$1"; }
cyan() { printf "\033[36m%s\033[0m" "$1"; }
red() { printf "\033[31m%s\033[0m" "$1"; }
dim() { printf "\033[2m%s\033[0m" "$1"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

printf "\n%s\n\n" "$(bold ">_ Chiron OS Installer")"

# ── Check existing installation ───────────────────────────
CHIRON_DIR="$HOME/.chiron"
if [ -f "$CHIRON_DIR/chiron.db" ]; then
  printf "%s Chiron OS is already installed.\n" "$(yellow "!")"
  printf "  Reset and reinstall? This will delete the database and config. (y/N) "
  read -r answer
  if [[ "$answer" =~ ^[Yy]$ ]]; then
    printf "  Resetting...\n"
    rm -rf "$CHIRON_DIR"
  else
    printf "\n  Already installed. Run %s to start.\n\n" "$(cyan "pnpm dev")"
    exit 0
  fi
fi

# ── Check git ─────────────────────────────────────────────
printf "%s Checking git... " "$(cyan "[1/5]")"
if command -v git &>/dev/null; then
  printf "%s\n" "$(green "$(git --version)")"
else
  printf "\n%s git is not installed.\n" "$(red "ERROR:")"
  printf "  Install git: %s\n\n" "$(dim "https://git-scm.com/downloads")"
  exit 1
fi

# ── Check / install Node.js ──────────────────────────────
printf "%s Checking Node.js... " "$(cyan "[2/5]")"

node_ok() {
  command -v node &>/dev/null && [ "$(node -e 'process.stdout.write(String(process.versions.node.split(".")[0]))')" -ge 20 ] 2>/dev/null
}

load_nvm() {
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck source=/dev/null
    . "$NVM_DIR/nvm.sh"
    return 0
  fi
  return 1
}

if node_ok; then
  printf "%s\n" "$(green "node $(node --version)")"
else
  if command -v node &>/dev/null; then
    printf "%s\n" "$(yellow "node $(node --version) — need >= 20")"
  else
    printf "%s\n" "$(yellow "not found")"
  fi

  # Try loading existing nvm first
  if load_nvm && node_ok; then
    printf "  Loaded nvm — %s\n" "$(green "node $(node --version)")"
  else
    # Install nvm if not present
    if ! load_nvm; then
      printf "  Installing nvm...\n"
      curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
      load_nvm
    fi

    printf "  Installing Node.js 22 via nvm...\n"
    nvm install 22
    printf "  %s\n" "$(green "node $(node --version)")"
  fi
fi

# ── Check / install pnpm ─────────────────────────────────
printf "%s Checking pnpm... " "$(cyan "[3/5]")"

if command -v pnpm &>/dev/null; then
  printf "%s\n" "$(green "pnpm $(pnpm --version)")"
else
  printf "%s\n" "$(yellow "not found")"
  if command -v corepack &>/dev/null; then
    printf "  Installing pnpm via corepack...\n"
    corepack enable
    corepack prepare pnpm@9.15.4 --activate
  else
    printf "  Installing pnpm via npm...\n"
    npm install -g pnpm@9.15.4
  fi
  printf "  %s\n" "$(green "pnpm $(pnpm --version)")"
fi

# ── Install dependencies ─────────────────────────────────
printf "%s Installing dependencies...\n" "$(cyan "[4/5]")"
pnpm install

# ── Run setup (db + seed + config) ───────────────────────
printf "%s Running setup...\n" "$(cyan "[5/5]")"
pnpm setup

# ── Done ──────────────────────────────────────────────────
printf "\n%s\n\n" "$(green "Installation complete!")"
printf "%s\n\n" "$(bold "Next steps:")"
printf "  %s If you have Claude Code installed and authenticated, you're all set!\n" "$(yellow "1.")"
printf "     %s\n\n" "$(dim "(free — no API key needed)")"
printf "  %s Otherwise, configure an API key:\n" "$(yellow "2.")"
printf "     %s\n" "$(dim "Edit ~/.chiron/config.json and add: \"apiKey\": \"sk-ant-...\"")"
printf "     %s\n\n" "$(dim "Or: export ANTHROPIC_API_KEY=\"sk-ant-...\"")"
printf "  %s Start the dev server:\n" "$(yellow "3.")"
printf "     %s\n\n" "$(dim "pnpm dev")"
printf "  %s Open %s in your browser\n\n" "$(yellow "4.")" "$(cyan "http://localhost:4173")"
