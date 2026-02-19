#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-}"
OUT="${OUT:-docs/crack-log.md}"

if [[ -z "${PROJECT_ID}" || -z "${REGION}" ]]; then
  echo "ERROR: PROJECT_ID and REGION are required."
  exit 1
fi

mkdir -p "$(dirname "${OUT}")"

{
  echo "# Hathor Red War Room — Crack Log"
  echo
  echo "- date_utc: $(date -u +"%Y-%m-%dT%H:%M:%SZ")"
  echo "- project: ${PROJECT_ID}"
  echo "- region: ${REGION}"
  echo "- driver: "
  echo "- scribe: "
  echo
  echo "## Decisions"
  echo "- staging public? public-stg public / admin-stg private: "
  echo "- admin invoker now: user:renee@mangu-publishers.com"
  echo "- admin invoker next: group:tool-admins@mangu-publishers.com"
  echo
  echo "## Inventory Output (GROUND TRUTH)"
  echo '```text'
  PROJECT_ID="${PROJECT_ID}" REGION="${REGION}" ./scripts/gcp-inventory.sh
  echo '```'
  echo
  echo "## Truth Questions (YES/NO + evidence)"
  echo "1) 4 Cloud Run services present? "
  echo "2) 3 triggers present? "
  echo "3) Admin private (no allUsers invoker)? "
  echo "4) Runtime SAs per env/service exist? "
  echo "5) Firestore exists + IAM ok? "
  echo "6) Uptime checks for prod /healthz? "
  echo
  echo "## Crack List (ONLY items that are NO)"
  echo "- [ ] Crack #1:"
  echo "  - owner:"
  echo "  - fix:"
  echo "  - proof:"
} > "${OUT}"

echo "Wrote: ${OUT}"
