#!/usr/bin/env bash
set -euo pipefail

source "$(dirname "$0")/common-env.sh"

out_file="docs/ops/inventory.md"
mkdir -p "$(dirname "$out_file")"

timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

if ! require_cmd gcloud "Run this from Cloud Shell or via 'make toolbox-shell', then rerun 'make inventory'."; then
  cat > "$out_file" <<MARKDOWN
# GCP Inventory

Generated: ${timestamp}

## Status

- gcloud CLI was not available in the current environment.
- Use Cloud Shell (canonical path) or run inside the local toolbox container.

## Next command

\`make toolbox-shell\`
\`make inventory\`
MARKDOWN
  echo "[ok] Wrote scaffold inventory to $out_file"
  exit 0
fi

active_project="$(gcloud config get-value project 2>/dev/null || true)"
projects="$(gcloud projects list --format='value(projectId)' 2>/dev/null || true)"

{
  echo "# GCP Inventory"
  echo
  echo "Generated: ${timestamp}"
  echo
  echo "## Active project"
  echo
  if [[ -n "$active_project" ]]; then
    echo "- ${active_project}"
  else
    echo "- (none configured)"
  fi
  echo
  echo "## Accessible projects"
  echo
  if [[ -n "$projects" ]]; then
    while IFS= read -r project; do
      [[ -z "$project" ]] && continue
      echo "- ${project}"
    done <<< "$projects"
  else
    echo "- No projects returned (or insufficient permissions)."
  fi
} > "$out_file"

echo "[ok] Wrote inventory to $out_file"
