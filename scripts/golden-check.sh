#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"
ADMIN_GROUP="${ADMIN_GROUP:-group:admins@mangu-platforms.com}"
ADMIN_SERVICES=(hathor-red-admin-stg hathor-red-admin-prod)

if [[ -z "${PROJECT_ID}" ]]; then
  echo "ERROR: PROJECT_ID is required for golden-check." >&2
  exit 2
fi

failures=0

for svc in "${ADMIN_SERVICES[@]}"; do
  echo "Checking admin IAM hard lock for ${svc}"
  policy="$(gcloud run services get-iam-policy "${svc}" --project="${PROJECT_ID}" --region="${REGION}" --format='json' 2>/dev/null || true)"

  if [[ -z "${policy}" ]]; then
    echo "WARN: ${svc} not found or policy unavailable; skipping."
    continue
  fi

  if echo "${policy}" | rg -q '"allUsers"'; then
    echo "FAIL: ${svc} grants roles/run.invoker to allUsers (P0 exposure)." >&2
    failures=$((failures + 1))
  fi

  if ! echo "${policy}" | rg -q "${ADMIN_GROUP}"; then
    echo "FAIL: ${svc} is missing ${ADMIN_GROUP} invoker binding." >&2
    failures=$((failures + 1))
  fi
done

if (( failures > 0 )); then
  echo "golden-check failed with ${failures} issue(s)." >&2
  exit 1
fi

echo "golden-check passed."
