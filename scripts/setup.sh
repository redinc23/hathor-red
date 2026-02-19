#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "==> hathor-red dev setup"

# 1. Node version check
REQUIRED_NODE="18.17.0"
CURRENT_NODE="$(node --version 2>/dev/null | sed 's/v//' || echo '0')"
if [ "$(printf '%s\n%s' "$REQUIRED_NODE" "$CURRENT_NODE" | sort -V | head -1)" != "$REQUIRED_NODE" ]; then
  echo "ERROR: Node.js >= $REQUIRED_NODE required (found $CURRENT_NODE)."
  echo "       Use nvm: nvm install && nvm use, or install via https://nodejs.org"
  exit 1
fi
echo "    Node $(node --version) ✓"

# 2. pnpm check
if ! command -v pnpm &>/dev/null; then
  echo "ERROR: pnpm not found. Install it: npm install -g pnpm@8.9.0"
  exit 1
fi
echo "    pnpm $(pnpm --version) ✓"

# 3. Install dependencies (frozen lockfile = reproducible)
echo "==> Installing dependencies (frozen lockfile)"
cd "$ROOT"
pnpm install --frozen-lockfile

# 4. Bootstrap env file
if [ ! -f "$ROOT/.env" ]; then
  cp "$ROOT/.env.example" "$ROOT/.env"
  echo "==> Created .env from .env.example — fill in your secrets."
else
  echo "==> .env already exists, skipping."
fi

# 5. Git hooks
if [ -d "$ROOT/.git" ]; then
  echo "==> Installing git hooks"
  pnpm exec husky
fi

echo ""
echo "Setup complete. Next steps:"
echo "  1. Edit .env with your DB / Redis / JWT values"
echo "  2. make docker-up     # start Postgres + Redis"
echo "  3. pnpm run db:setup  # seed the database"
echo "  4. make dev           # start the dev server"
