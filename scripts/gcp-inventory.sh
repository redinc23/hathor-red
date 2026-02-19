#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-}"
REGION="${REGION:-us-central1}"

if [[ -z "${PROJECT_ID}" ]]; then
  echo "ERROR: PROJECT_ID is required. Example: PROJECT_ID=my-project REGION=us-central1 ./scripts/gcp-inventory.sh" >&2
  exit 1
fi

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "ERROR: Required command '$1' not found in PATH." >&2
    exit 1
  fi
}

require_cmd gcloud

if ! command -v rg >/dev/null 2>&1; then
  if ! command -v grep >/dev/null 2>&1; then
    echo "ERROR: Neither 'rg' nor 'grep' found in PATH." >&2
    exit 1
  fi
  GREP_CMD=grep
else
  GREP_CMD=rg
fi

header() {
  echo
  echo "=================================================="
  echo "$1"
  echo "=================================================="
}

echo "Collecting GCP inventory for project=${PROJECT_ID}, region=${REGION}"

gcloud config set project "${PROJECT_ID}" >/dev/null

header "APIs (core platform)"
gcloud services list --enabled --project "${PROJECT_ID}" \
  --format="table(config.name,title)" \
  --filter="config.name:(run.googleapis.com OR cloudbuild.googleapis.com OR artifactregistry.googleapis.com OR secretmanager.googleapis.com OR firestore.googleapis.com OR monitoring.googleapis.com OR logging.googleapis.com)"

header "Artifact Registry repositories"
gcloud artifacts repositories list --project "${PROJECT_ID}" --location "${REGION}" \
  --format="table(name.basename(),format,description,createTime)"

header "Cloud Build triggers"
gcloud builds triggers list --project "${PROJECT_ID}" \
  --format="table(name,id,github.owner,github.name,github.push.branch,github.pullRequest.branch)"

header "Cloud Run services"
gcloud run services list --project "${PROJECT_ID}" --region "${REGION}" \
  --format="table(metadata.name,status.url,status.latestReadyRevisionName,spec.template.spec.serviceAccountName)"

header "Cloud Run IAM policy (allUsers/allAuthenticatedUsers)"
services=$(gcloud run services list --project "${PROJECT_ID}" --region "${REGION}" --format="value(metadata.name)")
if [[ -z "${services}" ]]; then
  echo "No Cloud Run services found in region ${REGION}."
else
  while IFS= read -r svc; do
    [[ -z "${svc}" ]] && continue
    public_bindings=$(gcloud run services get-iam-policy "${svc}" \
      --project "${PROJECT_ID}" --region "${REGION}" \
      --format="value(bindings.role,bindings.members)" | ${GREP_CMD} 'allUsers|allAuthenticatedUsers' || true)

    if [[ -n "${public_bindings}" ]]; then
      echo "${svc}: ${public_bindings}"
    else
      echo "${svc}: (no public invoker members)"
    fi
  done <<< "${services}"
fi

header "Service Accounts (tool runtime naming)"
gcloud iam service-accounts list --project "${PROJECT_ID}" \
  --format="table(email,displayName,disabled)" \
  --filter="email~'-public-(stg|prod)-sa@' OR email~'-admin-(stg|prod)-sa@'"

header "Firestore database"
gcloud firestore databases list --project "${PROJECT_ID}" \
  --format="table(name,locationId,type,concurrencyMode)"

header "Done"
echo "Inventory complete. Use this output as input for terraform import/drift remediation."
