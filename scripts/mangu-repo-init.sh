#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: scripts/mangu-repo-init.sh [--target <path>] [--with-service-skeleton]

Idempotently bootstraps a repo with:
- docs skeleton (crack log, ADR template, runbooks)
- Cloud Build CI/CD yaml files (ci, stg, prod)
- .dockerignore defaults
- .env.example baseline hooks
- optional service skeletons in services/public-api and services/admin-api
USAGE
}

TARGET_DIR="."
WITH_SERVICE_SKELETON="false"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target)
      TARGET_DIR="${2:-}"
      shift 2
      ;;
    --with-service-skeleton)
      WITH_SERVICE_SKELETON="true"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ -z "$TARGET_DIR" ]]; then
  echo "Target directory cannot be empty." >&2
  exit 1
fi

mkdir -p "$TARGET_DIR"
cd "$TARGET_DIR"

write_if_missing() {
  local path="$1"
  shift

  if [[ -f "$path" ]]; then
    echo "skip   $path (already exists)"
    return 0
  fi

  mkdir -p "$(dirname "$path")"
  cat > "$path"
  echo "create $path"
}

append_if_missing_line() {
  local path="$1"
  local line="$2"

  touch "$path"

  if ! grep -Fxq "$line" "$path"; then
    printf '%s\n' "$line" >> "$path"
    echo "append $path :: $line"
  else
    echo "skip   $path :: $line"
  fi
}

write_if_missing docs/crack-log.md <<'EOF_DOC'
# Crack Log

Use this log to record every production/staging crack (incident, failed deploy, regression) and the corrective action.

## Entries
- _YYYY-MM-DD_: _summary_, _impact_, _owner_, _follow-up PR_
EOF_DOC

write_if_missing docs/decisions/adr-0001-template.md <<'EOF_ADR'
# ADR-0001: Title

- Status: Proposed
- Date: YYYY-MM-DD
- Owners: team-name

## Context
What constraints, risks, or incidents require this decision?

## Decision
What was chosen?

## Consequences
- Positive:
- Negative:
- Follow-up:
EOF_ADR

write_if_missing docs/runbooks/incident-response.md <<'EOF_INCIDENT'
# Incident Response Runbook

1. Acknowledge incident and assign an incident commander.
2. Classify severity and establish impact window.
3. Apply containment (rollback, traffic shift, feature flag, IAM lock).
4. Capture timeline in docs/crack-log.md.
5. Publish status updates and post-incident action items.
EOF_INCIDENT

write_if_missing docs/runbooks/rollback.md <<'EOF_ROLLBACK'
# Rollback Runbook

## Preconditions
- Last known good deploy artifact available.
- Operator access to deploy pipeline and runtime IAM.

## Steps
1. Identify bad release SHA.
2. Promote previous stable artifact or redeploy previous SHA.
3. Verify `/healthz` and core smoke paths.
4. Record rollback reason in crack log and incident report.
EOF_ROLLBACK

write_if_missing cloudbuild.ci.yaml <<'EOF_CI'
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/hathor-red:$SHORT_SHA', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['run', '--rm', 'gcr.io/$PROJECT_ID/hathor-red:$SHORT_SHA', 'npm', 'test']
options:
  logging: CLOUD_LOGGING_ONLY
EOF_CI

write_if_missing cloudbuild.cd.stg.yaml <<'EOF_STG'
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/hathor-red-public-stg:$SHORT_SHA', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/hathor-red-public-stg:$SHORT_SHA']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - run
      - deploy
      - hathor-red-public-stg
      - --image=gcr.io/$PROJECT_ID/hathor-red-public-stg:$SHORT_SHA
      - --region=us-central1
      - --allow-unauthenticated
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - run
      - deploy
      - hathor-red-admin-stg
      - --image=gcr.io/$PROJECT_ID/hathor-red-public-stg:$SHORT_SHA
      - --region=us-central1
      - --no-allow-unauthenticated
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: bash
    args:
      - -ceu
      - |
        gcloud run services remove-iam-policy-binding hathor-red-admin-stg \
          --region=us-central1 \
          --member=allUsers \
          --role=roles/run.invoker || true
        gcloud run services add-iam-policy-binding hathor-red-admin-stg \
          --region=us-central1 \
          --member="${_ADMIN_MEMBER}" \
          --role=roles/run.invoker
options:
  logging: CLOUD_LOGGING_ONLY
substitutions:
  _ADMIN_MEMBER: user:renee@mangu-publishers.com
EOF_STG

write_if_missing cloudbuild.cd.prod.yaml <<'EOF_PROD'
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/hathor-red-public-prod:$SHORT_SHA', '.']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['push', 'gcr.io/$PROJECT_ID/hathor-red-public-prod:$SHORT_SHA']
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - run
      - deploy
      - hathor-red-public-prod
      - --image=gcr.io/$PROJECT_ID/hathor-red-public-prod:$SHORT_SHA
      - --region=us-central1
      - --allow-unauthenticated
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: gcloud
    args:
      - run
      - deploy
      - hathor-red-admin-prod
      - --image=gcr.io/$PROJECT_ID/hathor-red-public-prod:$SHORT_SHA
      - --region=us-central1
      - --no-allow-unauthenticated
  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: bash
    args:
      - -ceu
      - |
        gcloud run services remove-iam-policy-binding hathor-red-admin-prod \
          --region=us-central1 \
          --member=allUsers \
          --role=roles/run.invoker || true
        gcloud run services add-iam-policy-binding hathor-red-admin-prod \
          --region=us-central1 \
          --member="${_ADMIN_MEMBER}" \
          --role=roles/run.invoker
options:
  logging: CLOUD_LOGGING_ONLY
substitutions:
  _ADMIN_MEMBER: user:renee@mangu-publishers.com
EOF_PROD

append_if_missing_line .dockerignore 'node_modules'
append_if_missing_line .dockerignore 'npm-debug.log'
append_if_missing_line .dockerignore '.env'
append_if_missing_line .dockerignore '.git'
append_if_missing_line .dockerignore 'dist'
append_if_missing_line .dockerignore '.turbo'
append_if_missing_line .dockerignore '.next'

write_if_missing .env.example <<'EOF_ENV'
# Runtime
NODE_ENV=development
PORT=3000

# Data plane
FIRESTORE_PROJECT_ID=your-gcp-project-id
FIRESTORE_DATABASE=(default)

# Observability hooks
LOG_LEVEL=info
SENTRY_DSN=

# Generator hook placeholders
# export ENV_CONTEXT=stg|prod
# scripts/generate-env-example.sh "$ENV_CONTEXT"
EOF_ENV

if [[ "$WITH_SERVICE_SKELETON" == "true" ]]; then
  write_if_missing services/public-api/package.json <<'EOF_PUBLIC_PKG'
{
  "name": "public-api",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.19.2"
  }
}
EOF_PUBLIC_PKG

  write_if_missing services/public-api/index.js <<'EOF_PUBLIC_JS'
const express = require('express');

const app = express();
const port = process.env.PORT || 8080;

app.get('/healthz', (_req, res) => {
  res.status(200).json({ service: 'public-api', status: 'ok' });
});

app.listen(port, () => {
  console.log(`public-api listening on ${port}`);
});
EOF_PUBLIC_JS

  write_if_missing services/admin-api/package.json <<'EOF_ADMIN_PKG'
{
  "name": "admin-api",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "start": "node index.js"
  },
  "dependencies": {
    "express": "^4.19.2"
  }
}
EOF_ADMIN_PKG

  write_if_missing services/admin-api/index.js <<'EOF_ADMIN_JS'
const express = require('express');

const app = express();
const port = process.env.PORT || 8081;

app.get('/healthz', (_req, res) => {
  res.status(200).json({ service: 'admin-api', status: 'ok' });
});

app.listen(port, () => {
  console.log(`admin-api listening on ${port}`);
});
EOF_ADMIN_JS
fi

echo "Repository bootstrap complete."
