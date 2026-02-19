#!/usr/bin/env bash
# Run the Jest test suite.
# Pass --coverage to emit a coverage report to coverage/.
# In CI, pass --ci for deterministic output (no interactive TTY).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Jest"
"$ROOT/node_modules/.bin/jest" "$@"
echo "    Tests passed ✓"
