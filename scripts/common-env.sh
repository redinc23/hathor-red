#!/usr/bin/env bash
set -euo pipefail

require_cmd() {
  local cmd="$1"
  local help_text="$2"

  if command -v "$cmd" >/dev/null 2>&1; then
    return 0
  fi

  echo "[info] '$cmd' is not installed in this environment."
  echo "[info] $help_text"
  return 1
}
