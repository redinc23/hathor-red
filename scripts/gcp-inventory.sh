#!/usr/bin/env bash
set -u

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"
ADMIN_GROUP="${ADMIN_GROUP:-group:admins@mangu-platforms.com}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "ERROR: PROJECT_ID is not set and no default gcloud project was found."
  exit 1
fi

echo "=== Hathor Red GCP Reality Inventory ==="
echo "Project: ${PROJECT_ID}"
echo "Region: ${REGION}"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo

run_section() {
  local title="$1"
  shift
  echo "## ${title}"
  if "$@"; then
    :
  else
    echo "(warning) command failed: $*"
  fi
  echo
}

print_summary_line() {
  local label="$1"
  local value="$2"
  printf -- "- %-40s %s\n" "${label}" "${value}"
}

run_section "Enabled APIs" gcloud services list --enabled --project="${PROJECT_ID}" \
  --format="table(config.name,title,state)"

run_section "Firestore database" gcloud firestore databases describe --project="${PROJECT_ID}" \
  --database="(default)" --format="yaml(name,type,locationId,uid,concurrencyMode,appEngineIntegrationMode)"

run_section "Cloud Run services" gcloud run services list --project="${PROJECT_ID}" --region="${REGION}" \
  --format="table(metadata.name,status.url,status.latestReadyRevisionName,status.conditions[0].status)"

for svc in hathor-red-admin-stg hathor-red-admin-prod; do
  run_section "IAM policy: ${svc}" gcloud run services get-iam-policy "${svc}" --project="${PROJECT_ID}" \
    --region="${REGION}" --format="table(bindings.role,bindings.members)"
done

for svc in hathor-red-public-stg hathor-red-admin-stg hathor-red-public-prod hathor-red-admin-prod; do
  run_section "Service details: ${svc}" gcloud run services describe "${svc}" --project="${PROJECT_ID}" \
    --region="${REGION}" --format="yaml(metadata.name,spec.template.spec.serviceAccountName,status.url,status.traffic)"
done

run_section "Cloud Build triggers" gcloud builds triggers list --project="${PROJECT_ID}" \
  --format="table(name,description,filename,disabled,github.pullRequest.branch,github.push.branch)"

run_section "Uptime checks" gcloud monitoring uptime list-configs --project="${PROJECT_ID}" \
  --format="table(displayName,timeout,period,selectedRegions,httpCheck.path,monitoredResource.type)"

run_section "Alert policies" gcloud alpha monitoring policies list --project="${PROJECT_ID}" \
  --format="table(displayName,enabled,combiner,notificationChannels)"

run_section "Project service accounts" gcloud iam service-accounts list --project="${PROJECT_ID}" \
  --format="table(email,disabled,displayName)"

echo "## Runtime SA datastore.user bindings"
for sa in hathor-red-public-stg-sa hathor-red-admin-stg-sa hathor-red-public-prod-sa hathor-red-admin-prod-sa; do
  echo "---- ${sa}"
  gcloud projects get-iam-policy "${PROJECT_ID}" \
    --flatten="bindings[].members" \
    --filter="bindings.members:serviceAccount:${sa}@${PROJECT_ID}.iam.gserviceaccount.com AND bindings.role=roles/datastore.user" \
    --format="value(bindings.role)" | head -n 5 || true
  echo
done

echo "## Crack summary"
ADMIN_EXPOSURE="$(gcloud run services get-iam-policy hathor-red-admin-prod --project="${PROJECT_ID}" --region="${REGION}" --format='value(bindings.members)' 2>/dev/null | tr ';' '\n' | rg -c '^allUsers$' || true)"
ADMIN_GROUP_PRESENT="$(gcloud run services get-iam-policy hathor-red-admin-prod --project="${PROJECT_ID}" --region="${REGION}" --format='value(bindings.members)' 2>/dev/null | tr ';' '\n' | rg -c "^${ADMIN_GROUP}$" || true)"

print_summary_line "Admin prod exposed to allUsers" "${ADMIN_EXPOSURE:-0}"
print_summary_line "Admin prod admin-group invoker" "${ADMIN_GROUP_PRESENT:-0}"
print_summary_line "Inventory script status" "complete"
