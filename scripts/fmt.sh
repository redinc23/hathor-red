#!/usr/bin/env bash
# Auto-fix lint issues with eslint --fix.
# Run this before committing if lint check fails.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> ESLint --fix"
"$ROOT/node_modules/.bin/eslint" . --fix
echo "    Done. Re-run 'make lint' to verify no remaining warnings."
