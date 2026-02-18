#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:=encoded-shape-487615-b1}"
: "${REGION:=us-central1}"
: "${OUT_PATH:=docs/crack-log.md}"

usage() {
  cat <<EOF_USAGE
Usage:
  PROJECT_ID=... REGION=... ./scripts/write-crack-log.sh [--skip-inventory]

Behavior:
  - If gcloud is present and --skip-inventory not set: runs scripts/gcp-inventory.sh and embeds output.
  - If gcloud is missing (or --skip-inventory): writes scaffold + instructions and exits 0.
EOF_USAGE
}

SKIP_INVENTORY="false"
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi
if [[ "${1:-}" == "--skip-inventory" ]]; then
  SKIP_INVENTORY="true"
fi

mkdir -p "$(dirname "$OUT_PATH")"

timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

write_header() {
  cat > "$OUT_PATH" <<EOF_HEADER
# Crack Log

Generated: ${timestamp}

## Operating rule
A "crack" is a structural weakness (assumption, missing validation, unobserved behavior, overly-broad access, unclear rollback).
Record cracks even if speculative.

---

## Latest inventory snapshot
EOF_HEADER
}

write_no_gcloud_note() {
  cat >> "$OUT_PATH" <<EOF_NO_GCLOUD

> Inventory was not executed because \`gcloud\` was not found in PATH (or --skip-inventory was used).
> Run this in **Cloud Shell**:
>
> \`\`\`bash
> cd /path/to/repo
> PROJECT_ID=${PROJECT_ID} REGION=${REGION} ./scripts/gcp-inventory.sh
> \`\`\`

EOF_NO_GCLOUD
}

write_inventory_block() {
  cat >> "$OUT_PATH" <<EOF_INVENTORY

\`\`\`
EOF_INVENTORY
  PROJECT_ID="$PROJECT_ID" REGION="$REGION" ./scripts/gcp-inventory.sh >> "$OUT_PATH"
  cat >> "$OUT_PATH" <<EOF_INVENTORY_END
\`\`\`

EOF_INVENTORY_END
}

write_template() {
  cat >> "$OUT_PATH" <<'EOF_TEMPLATE'
---

## Cracks

### YYYY-MM-DD
- **Crack:** 
- **Why it matters:** 
- **Signal / detection:** 
- **Mitigation:** 
- **Owner:** 
- **Status:** Open | Mitigated | Closed

EOF_TEMPLATE
}

write_header

if [[ "$SKIP_INVENTORY" == "true" ]]; then
  write_no_gcloud_note
  write_template
  echo "Wrote scaffold (inventory skipped): $OUT_PATH"
  exit 0
fi

if ! command -v gcloud >/dev/null 2>&1; then
  write_no_gcloud_note
  write_template
  echo "Wrote scaffold (gcloud missing): $OUT_PATH"
  exit 0
fi

if [[ ! -x "./scripts/gcp-inventory.sh" ]]; then
  cat >> "$OUT_PATH" <<EOF_MISSING_SCRIPT

> Inventory not executed because ./scripts/gcp-inventory.sh is missing or not executable.
EOF_MISSING_SCRIPT
  write_template
  echo "Wrote scaffold (inventory script missing): $OUT_PATH"
  exit 0
fi

write_inventory_block
write_template
echo "Wrote crack log with embedded inventory: $OUT_PATH"
