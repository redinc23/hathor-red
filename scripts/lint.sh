#!/usr/bin/env bash
# Lint the server-side codebase.
# Uses the local ESLint binary directly to avoid version conflicts with npm
# scripts that might resolve to ESLint v10 (which rejects .eslintrc.cjs).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> ESLint (zero warnings)"
"$ROOT/node_modules/.bin/eslint" . --max-warnings=0
echo "    Lint clean ✓"
