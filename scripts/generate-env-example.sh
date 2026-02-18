#!/usr/bin/env bash
set -euo pipefail

ENV_CONTEXT="${1:-stg}"

case "$ENV_CONTEXT" in
  stg)
    FIRESTORE_PROJECT_ID="encoded-shape-487615-b1"
    API_BASE_URL="https://hathor-red-public-stg-<hash>-uc.a.run.app"
    ;;
  prod)
    FIRESTORE_PROJECT_ID="encoded-shape-487615-b1"
    API_BASE_URL="https://hathor-red-public-prod-<hash>-uc.a.run.app"
    ;;
  *)
    echo "Unsupported context: $ENV_CONTEXT (expected stg|prod)" >&2
    exit 1
    ;;
esac

cat <<EOF_ENV
NODE_ENV=${ENV_CONTEXT}
PORT=8080
API_BASE_URL=${API_BASE_URL}
FIRESTORE_PROJECT_ID=${FIRESTORE_PROJECT_ID}
FIRESTORE_DATABASE=(default)
LOG_LEVEL=info
EOF_ENV
