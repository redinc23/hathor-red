#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-}"

if [[ -z "${PROJECT_ID}" || -z "${REGION}" ]]; then
  echo "ERROR: PROJECT_ID and REGION are required."
  echo 'Example: PROJECT_ID="encoded-shape-487615-b1" REGION="us-central1" ./scripts/gcp-inventory.sh'
  exit 1
fi

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "ERROR: Missing command: $1"
    exit 1
  }
}

require_cmd gcloud
require_cmd jq

export CLOUDSDK_CORE_PROJECT="${PROJECT_ID}"

timestamp() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
hr() { printf "\n%s\n" "================================================================"; }
sec() { hr; echo "## $1"; }

SERVICES=(
  "hathor-red-public-stg"
  "hathor-red-admin-stg"
  "hathor-red-public-prod"
  "hathor-red-admin-prod"
)

echo "# Hathor Red GCP Inventory"
echo "timestamp_utc: $(timestamp)"
echo "project_id: ${PROJECT_ID}"
echo "region: ${REGION}"

sec "Auth / Context"
echo "active_account: $(gcloud auth list --filter=status:ACTIVE --format='value(account)' | head -n1 || true)"
echo "gcloud_project: $(gcloud config get-value project 2>/dev/null || true)"

sec "Cloud Run Services (existence + URL + runtime SA)"
CR_SVCS_JSON="$(gcloud run services list --region "${REGION}" --format=json 2>/dev/null || echo '[]')"
echo "${CR_SVCS_JSON}" | jq -r '.[] | [.metadata.name, (.status.url // ""), (.spec.template.spec.serviceAccountName // "")] | @tsv' \
  | awk 'BEGIN{FS="\t"} {printf "service=%s\turl=%s\truntime_sa=%s\n",$1,$2,$3}' \
  | sort || true

echo
echo "expected_services:"
for s in "${SERVICES[@]}"; do
  if echo "${CR_SVCS_JSON}" | jq -e --arg n "${s}" 'any(.[]; .metadata.name==$n)' >/dev/null; then
    echo "  - ${s}: PRESENT"
  else
    echo "  - ${s}: MISSING"
  fi
done

sec "Cloud Run IAM (public/private check: allUsers invoker)"
for s in "${SERVICES[@]}"; do
  if echo "${CR_SVCS_JSON}" | jq -e --arg n "${s}" 'any(.[]; .metadata.name==$n)' >/dev/null; then
    echo "service=${s}"
    POLICY_JSON="$(gcloud run services get-iam-policy "${s}" --region "${REGION}" --format=json 2>/dev/null)" || POLICY_FAILED=1
    if [[ -n "${POLICY_FAILED:-}" ]]; then
      echo "  allUsers_invoker: CHECK_FAILED (permissions missing)"
      echo "  invokers: (unable to fetch IAM policy)"
      unset POLICY_FAILED
    else
      ALLUSERS="$(echo "${POLICY_JSON}" | jq -r '[.bindings[]? | select(.role=="roles/run.invoker") | .members[]?] | map(select(.=="allUsers")) | length')"
      if [[ "${ALLUSERS}" == "0" ]]; then
        echo "  allUsers_invoker: NO"
      else
        echo "  allUsers_invoker: YES (PUBLIC!)"
      fi

      echo "  invokers:"
      echo "${POLICY_JSON}" | jq -r '.bindings[]? | select(.role=="roles/run.invoker") | .members[]?' | sed 's/^/    - /' || true
    fi
  else
    echo "service=${s} (skipped: missing)"
  fi
done

sec "Service Accounts (runtime SA existence scan)"
SA_JSON="$(gcloud iam service-accounts list --format=json 2>/dev/null || echo '[]')"
echo "${SA_JSON}" | jq -r '.[] | [.email, (.displayName // "")] | @tsv' \
  | awk 'BEGIN{FS="\t"} {printf "sa=%s\tdisplay=%s\n",$1,$2}' \
  | sort || true

sec "Firestore (database existence)"
# Firestore is at the project level; multiple databases possible (default is (default)).
# This command may fail if Firestore API isn't enabled.
if gcloud firestore databases list --format=json >/dev/null 2>&1; then
  gcloud firestore databases list --format=json | jq -r '.[] | "database=" + (.name // "") + "\ttype=" + (.type // "") + "\tlocation=" + (.locationId // "")' || true
else
  echo "firestore_databases: UNAVAILABLE (API disabled or permissions missing)"
fi

sec "Cloud Build Triggers"
TRIGGERS_JSON="$(gcloud builds triggers list --region "${REGION}" --format=json 2>/dev/null || echo '[]')"
echo "${TRIGGERS_JSON}" | jq -r '.[] | [.name, (.id // ""), (.eventType // ""), (.github.owner // .repositoryOwner // ""), (.github.name // .repositoryName // ""), (.filename // "")] | @tsv' \
  | awk 'BEGIN{FS="\t"} {printf "trigger=%s\tid=%s\tevent=%s\trepo=%s/%s\tyaml=%s\n",$1,$2,$3,$4,$5,$6}' \
  | sort || true

echo
echo "expected_triggers:"
echo "  - PR(main) CI"
echo "  - develop -> stg CD"
echo "  - main -> prod CD"
echo "note: verify by matching trigger names / branch patterns + yaml filenames above."

sec "Monitoring Uptime Checks (prod /healthz)"
# Requires Monitoring permissions.
if gcloud monitoring uptime-checks list --format=json >/dev/null 2>&1; then
  UPTIME_JSON="$(gcloud monitoring uptime-checks list --format=json)"
  echo "${UPTIME_JSON}" | jq -r '.[] | [.name, (.displayName // ""), (.httpCheck.path // ""), (.httpCheck.port // "" | tostring), (.monitoredResource.labels.host // "")] | @tsv' \
    | awk 'BEGIN{FS="\t"} {printf "uptime_name=%s\tdisplay=%s\tpath=%s\tport=%s\thost=%s\n",$1,$2,$3,$4,$5}' \
    | sort || true
else
  echo "uptime_checks: UNAVAILABLE (permissions missing)"
fi

sec "Crack Summary (auto-derived)"
missing_services=0
for s in "${SERVICES[@]}"; do
  if ! echo "${CR_SVCS_JSON}" | jq -e --arg n "${s}" 'any(.[]; .metadata.name==$n)' >/dev/null; then
    missing_services=$((missing_services + 1))
  fi
done

public_admin=0
for s in "hathor-red-admin-stg" "hathor-red-admin-prod"; do
  if echo "${CR_SVCS_JSON}" | jq -e --arg n "${s}" 'any(.[]; .metadata.name==$n)' >/dev/null; then
    POLICY_JSON="$(gcloud run services get-iam-policy "${s}" --region "${REGION}" --format=json 2>/dev/null)" || POLICY_FAILED=1
    if [[ -z "${POLICY_FAILED:-}" ]]; then
      ALLUSERS="$(echo "${POLICY_JSON}" | jq -r '[.bindings[]? | select(.role=="roles/run.invoker") | .members[]?] | map(select(.=="allUsers")) | length')"
      if [[ "${ALLUSERS}" != "0" ]]; then
        public_admin=$((public_admin + 1))
      fi
    fi
    unset POLICY_FAILED
  fi
done

echo "missing_cloud_run_services: ${missing_services}"
echo "admin_services_public_via_allUsers: ${public_admin}"
echo "action: any nonzero values above == crack list item(s)"

hr
echo "# End of inventory"
