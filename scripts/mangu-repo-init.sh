#!/usr/bin/env bash
set -Eeuo pipefail

# Mangu Factory — Repo Standard Pack Generator

RED="$(printf '\033[31m')"; YEL="$(printf '\033[33m')"; GRN="$(printf '\033[32m')"; BLU="$(printf '\033[34m')"; RST="$(printf '\033[0m')"
log(){ printf "%s\n" "${BLU}[mangu]${RST} $*"; }
ok(){ printf "%s\n" "${GRN}[ok]${RST} $*"; }
warn(){ printf "%s\n" "${YEL}[warn]${RST} $*"; }
die(){ printf "%s\n" "${RED}[err]${RST} $*" >&2; exit 1; }
need_cmd(){ command -v "$1" >/dev/null 2>&1 || die "Missing required command: $1"; }

safe_write_file(){
  local path="$1" content="$2" force="${3:-false}"
  if [[ -f "$path" && "$force" != "true" ]]; then
    warn "Skip existing file: $path (use --force to overwrite)"
    return 0
  fi
  mkdir -p "$(dirname "$path")"
  local tmp; tmp="$(mktemp)"
  printf "%s" "$content" > "$tmp"
  mv "$tmp" "$path"
  ok "Wrote: $path"
}

safe_append_unique_block(){
  local path="$1" marker="$2" block="$3"
  mkdir -p "$(dirname "$path")"; touch "$path"
  if grep -qF "$marker" "$path"; then
    warn "Skip append, marker already present: $path"; return 0
  fi
  {
    printf "\n%s\n" "$marker"
    printf "%s\n" "$block"
    printf "%s\n" "$marker"
  } >> "$path"
  ok "Appended block to: $path"
}

usage(){
cat <<'EOF'
Mangu Factory — Repo Standard Pack Generator

Commands:
  init

Options:
  --tool <name>
  --project <gcp-project>
  --region <region> (default: us-central1)
  --admins-group <email> (default: admins@mangu-platforms.com)
  --artifact-repo <name> (default: mangu-tools)
  --github-org <org>
  --repo <name>
  --force
EOF
}

MODE=""; TOOL=""; PROJECT=""; REGION="us-central1"; ADMINS_GROUP="admins@mangu-platforms.com"; ARTIFACT_REPO="mangu-tools"; GITHUB_ORG=""; REPO_NAME=""; FORCE="false"
PUBLIC_SVC_SUFFIX="public"; ADMIN_SVC_SUFFIX="admin"; TRIG_PR_SUFFIX="pr"; TRIG_STG_SUFFIX="stg"; TRIG_PROD_SUFFIX="prod"; ENV_STG="stg"; ENV_PROD="prod"

parse_args(){
  [[ $# -ge 1 ]] || { usage; exit 1; }
  if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then usage; exit 0; fi
  MODE="$1"; shift
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --tool) TOOL="${2:-}"; shift 2;;
      --project) PROJECT="${2:-}"; shift 2;;
      --region) REGION="${2:-}"; shift 2;;
      --admins-group) ADMINS_GROUP="${2:-}"; shift 2;;
      --artifact-repo) ARTIFACT_REPO="${2:-}"; shift 2;;
      --github-org) GITHUB_ORG="${2:-}"; shift 2;;
      --repo) REPO_NAME="${2:-}"; shift 2;;
      --force) FORCE="true"; shift;;
      -h|--help) usage; exit 0;;
      *) die "Unknown arg: $1";;
    esac
  done
}

validate_args(){
  [[ "$MODE" == "init" ]] || die "Unknown command: $MODE"
  [[ -d .git ]] || die "Run from repo root (missing .git)."
  [[ -n "$TOOL" ]] || die "--tool is required"
  [[ -n "$PROJECT" ]] || die "--project is required"
  [[ -n "$REGION" ]] || die "--region is required"
  [[ -n "$REPO_NAME" ]] || REPO_NAME="$TOOL"
  [[ -n "$GITHUB_ORG" ]] || GITHUB_ORG="UNKNOWN_ORG"
}

generate(){
  mkdir -p scripts cloudbuild docs/ops docs/runbooks services/public services/admin "infra/live/$TOOL"

  safe_write_file "docs/ops/war-room.md" "# War Room — Mangu Factory

**Tool:** \
\`$TOOL\`  
**Repo:** \
\`$GITHUB_ORG/$REPO_NAME\`  
**GCP Project:** \
\`$PROJECT\`  
**Region:** \
\`$REGION\`

## Definitions

### “Alive” (must all be true)
1. Developer Connect linked
2. PR CI required on \`main\` and \`develop\`
3. \`develop → stg\` auto deploy
4. \`main → prod\` auto deploy
5. Admin plane private by IAM, invoker = \`group:$ADMINS_GROUP\`
6. Firestore heartbeat live + audit event on admin endpoint
7. Uptime check + alert policy exists for prod \`/healthz\`
8. Inventory + crack-log generated from Cloud Shell and committed
9. Terraform baseline applied or imported
10. Golden checklist passes
" "$FORCE"

  safe_write_file "docs/ops/project-baseline.md" "# Project Baseline — Governance

- public service: \`${TOOL}-${PUBLIC_SVC_SUFFIX}\`
- admin service: \`${TOOL}-${ADMIN_SVC_SUFFIX}\`
- triggers: \`${TOOL}-${TRIG_PR_SUFFIX}\`, \`${TOOL}-${TRIG_STG_SUFFIX}\`, \`${TOOL}-${TRIG_PROD_SUFFIX}\`
- admin invoker group: \`group:$ADMINS_GROUP\`
" "$FORCE"

  safe_write_file "docs/runbooks/triggers.md" "# Trigger Runbook — Cloud Build / Developer Connect

- PR trigger: \`${TOOL}-${TRIG_PR_SUFFIX}\`
- Staging trigger: \`${TOOL}-${TRIG_STG_SUFFIX}\`
- Production trigger: \`${TOOL}-${TRIG_PROD_SUFFIX}\`
- CI config: \`cloudbuild/ci.yaml\`
- Staging CD: \`cloudbuild/cd.stg.yaml\`
- Prod CD: \`cloudbuild/cd.prod.yaml\`
" "$FORCE"

  safe_write_file "docs/runbooks/secrets.md" "# Secrets Runbook — Secret Manager + Cloud Run

Naming: \`TOOL__ENV__KEY\`
Examples:
- \`${TOOL}__${ENV_STG}__JWT_SECRET\`
- \`${TOOL}__${ENV_PROD}__JWT_SECRET\`
" "$FORCE"

  safe_write_file "docs/runbooks/rollback.md" "# Rollback Runbook — Cloud Run

gcloud run services update-traffic ${TOOL}-${PUBLIC_SVC_SUFFIX} --to-revisions REVISION_NAME=100 --region $REGION --project $PROJECT

gcloud run services update-traffic ${TOOL}-${ADMIN_SVC_SUFFIX} --to-revisions REVISION_NAME=100 --region $REGION --project $PROJECT
" "$FORCE"

  safe_write_file "docs/golden-checklist.md" "# Golden Checklist — $TOOL

- [ ] cloudbuild/ci.yaml
- [ ] cloudbuild/cd.stg.yaml
- [ ] cloudbuild/cd.prod.yaml
- [ ] scripts/inventory.sh
- [ ] scripts/cracklog.sh
- [ ] scripts/secrets.sh
- [ ] docs/ops/war-room.md
- [ ] docs/ops/project-baseline.md
" "$FORCE"

  safe_write_file Makefile 'SHELL := /usr/bin/env bash
.PHONY: help golden-check inventory cracklog test ci
help:
	@echo "Targets: golden-check inventory cracklog test ci"
golden-check:
	@./scripts/golden-check.sh
inventory:
	@./scripts/inventory.sh
cracklog:
	@./scripts/cracklog.sh
test:
	@echo "No tests wired yet. Add tests and update this target."
ci: golden-check test
' "$FORCE"

  safe_write_file scripts/golden-check.sh '#!/usr/bin/env bash
set -Eeuo pipefail
req_files=(
  cloudbuild/ci.yaml cloudbuild/cd.stg.yaml cloudbuild/cd.prod.yaml
  scripts/inventory.sh scripts/cracklog.sh scripts/secrets.sh scripts/golden-check.sh
  docs/ops/war-room.md docs/ops/project-baseline.md docs/runbooks/triggers.md docs/runbooks/secrets.md docs/runbooks/rollback.md docs/golden-checklist.md
  infra/live/'"$TOOL"'/main.tf infra/live/'"$TOOL"'/variables.tf infra/live/'"$TOOL"'/outputs.tf
)
missing=0
for f in "${req_files[@]}"; do [[ -f "$f" ]] || { echo "[missing] $f"; missing=1; }; done
[[ "$missing" -eq 0 ]] || { echo "Golden check failed."; exit 1; }
echo "Golden check passed."
' "$FORCE"

  safe_write_file scripts/inventory.sh '#!/usr/bin/env bash
set -Eeuo pipefail
TOOL='"$TOOL"'
PROJECT='"$PROJECT"'
REGION='"$REGION"'
ADMINS_GROUP='"$ADMINS_GROUP"'
mkdir -p inventory
out="inventory/${TOOL}__$(date -u +%Y%m%dT%H%M%SZ).md"
cat > "$out" <<INV
# Inventory — ${TOOL}
- Generated: $(date -u)
- Project: ${PROJECT}
- Region: ${REGION}

Manual checks:
- Developer Connect linked
- Uptime check + alert for /healthz
- Firestore heartbeat live
INV
echo "Generated inventory at: $out"
' "$FORCE"

  safe_write_file scripts/cracklog.sh '#!/usr/bin/env bash
set -Eeuo pipefail
TOOL='"$TOOL"'
mkdir -p cracklog
out="cracklog/${TOOL}__$(date -u +%Y%m%dT%H%M%SZ).md"
inv_latest="$(ls -1t inventory/${TOOL}__*.md 2>/dev/null | head -n 1 || true)"
{
  echo "# Crack Log — ${TOOL}"
  echo
  echo "- Generated: $(date -u)"
  if [[ -n "$inv_latest" ]]; then
    echo "- Source: $inv_latest"
  else
    echo "**P1:** No inventory found. Run make inventory first."
  fi
} > "$out"
echo "Generated cracklog at: $out"
' "$FORCE"

  safe_write_file scripts/secrets.sh '#!/usr/bin/env bash
set -Eeuo pipefail
PROJECT='"$PROJECT"'
REGION='"$REGION"'
TOOL='"$TOOL"'
cmd=${1:-}; shift || true
[[ -n "$cmd" ]] || { echo "Usage: create|bind|inject ..."; exit 1; }
ENV_NAME= KEY= VALUE= SA_EMAIL= SERVICE= VAR_NAME=
while [[ $# -gt 0 ]]; do
  case "$1" in
    --env) ENV_NAME="${2:-}"; shift 2;;
    --key) KEY="${2:-}"; shift 2;;
    --value) VALUE="${2:-}"; shift 2;;
    --service-account) SA_EMAIL="${2:-}"; shift 2;;
    --service) SERVICE="${2:-}"; shift 2;;
    --var) VAR_NAME="${2:-}"; shift 2;;
    *) echo "Unknown arg: $1"; exit 1;;
  esac
done
secret_id="${TOOL}__${ENV_NAME}__${KEY}"
case "$cmd" in
  create) printf "%s" "$VALUE" | gcloud secrets create "$secret_id" --project "$PROJECT" --replication-policy=automatic --data-file=- ;;
  bind) gcloud secrets add-iam-policy-binding "$secret_id" --project "$PROJECT" --member="serviceAccount:$SA_EMAIL" --role=roles/secretmanager.secretAccessor ;;
  inject) gcloud run services update "$SERVICE" --project "$PROJECT" --region "$REGION" --update-secrets "${VAR_NAME}=${secret_id}:latest" ;;
  *) echo "Unknown command: $cmd"; exit 1;;
esac
' "$FORCE"

  chmod +x scripts/golden-check.sh scripts/inventory.sh scripts/cracklog.sh scripts/secrets.sh

  safe_write_file cloudbuild/ci.yaml 'timeout: "1200s"
options:
  logging: CLOUD_LOGGING_ONLY
steps:
  - id: golden-check
    name: bash
    entrypoint: bash
    args: ["-c", "make golden-check"]
  - id: tests
    name: bash
    entrypoint: bash
    args: ["-c", "make test"]
' "$FORCE"

  safe_write_file cloudbuild/cd.stg.yaml "timeout: \"1800s\"
substitutions:
  _TOOL: \"$TOOL\"
  _REGION: \"$REGION\"
  _ENV: \"$ENV_STG\"
  _PUBLIC_SVC: \"${TOOL}-${PUBLIC_SVC_SUFFIX}\"
  _ADMIN_SVC: \"${TOOL}-${ADMIN_SVC_SUFFIX}\"
  _AR_REPO: \"$ARTIFACT_REPO\"
options:
  logging: CLOUD_LOGGING_ONLY
steps:
  - id: golden-check
    name: bash
    entrypoint: bash
    args: [\"-c\", \"make golden-check\"]
" "$FORCE"

  safe_write_file cloudbuild/cd.prod.yaml "timeout: \"1800s\"
substitutions:
  _TOOL: \"$TOOL\"
  _REGION: \"$REGION\"
  _ENV: \"$ENV_PROD\"
  _PUBLIC_SVC: \"${TOOL}-${PUBLIC_SVC_SUFFIX}\"
  _ADMIN_SVC: \"${TOOL}-${ADMIN_SVC_SUFFIX}\"
  _AR_REPO: \"$ARTIFACT_REPO\"
options:
  logging: CLOUD_LOGGING_ONLY
steps:
  - id: golden-check
    name: bash
    entrypoint: bash
    args: [\"-c\", \"make golden-check\"]
" "$FORCE"

  safe_write_file services/public/Dockerfile 'FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]
' "$FORCE"
  safe_write_file services/admin/Dockerfile 'FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
ENV NODE_ENV=production
EXPOSE 8080
CMD ["node", "server.js"]
' "$FORCE"

  safe_write_file services/public/package.json '{"name":"mangu-service","version":"0.1.0","private":true,"type":"module","main":"server.js","scripts":{"start":"node server.js"},"dependencies":{"@google-cloud/firestore":"^7.11.0","express":"^4.19.2"}}' "$FORCE"
  safe_write_file services/admin/package.json '{"name":"mangu-service","version":"0.1.0","private":true,"type":"module","main":"server.js","scripts":{"start":"node server.js"},"dependencies":{"@google-cloud/firestore":"^7.11.0","express":"^4.19.2"}}' "$FORCE"

  safe_write_file services/public/server.js "import express from 'express';
import { Firestore } from '@google-cloud/firestore';
const app = express(); const firestore = new Firestore();
const TOOL = process.env.TOOL || '$TOOL'; const ENV = process.env.ENV || 'unknown';
app.get('/healthz', (_req, res) => res.status(200).json({ ok: true, tool: TOOL, env: ENV, time: new Date().toISOString() }));
app.post('/heartbeat', async (_req, res) => { await firestore.collection('tool_state').doc(TOOL).set({ tool: TOOL, env: ENV, heartbeat_at: new Date().toISOString(), kind: 'heartbeat' }, { merge: true }); res.status(200).json({ ok: true }); });
app.get('/', (_req, res) => res.status(200).send('ok'));
app.listen(Number(process.env.PORT || 8080));
" "$FORCE"

  safe_write_file services/admin/server.js "import express from 'express';
import { Firestore } from '@google-cloud/firestore';
const app = express(); const firestore = new Firestore();
const TOOL = process.env.TOOL || '$TOOL'; const ENV = process.env.ENV || 'unknown';
app.use(express.json({ limit: '1mb' }));
app.get('/healthz', (_req, res) => res.status(200).json({ ok: true, tool: TOOL, env: ENV, time: new Date().toISOString() }));
app.post('/admin/do-thing', async (req, res) => { await firestore.collection('audit_log').add({ tool: TOOL, env: ENV, event: 'admin_do_thing', meta: { input_keys: Object.keys(req.body || {}) }, at: new Date().toISOString() }); res.status(200).json({ ok: true }); });
app.listen(Number(process.env.PORT || 8080));
" "$FORCE"

  safe_write_file "infra/live/$TOOL/main.tf" "terraform {
  required_version = \">= 1.5.0\"
  required_providers { google = { source = \"hashicorp/google\" version = \">= 5.0\" } }
}
provider \"google\" { project = var.project_id region = var.region }
resource \"google_project_service\" \"run\" { project = var.project_id service = \"run.googleapis.com\" }
resource \"google_project_service\" \"cloudbuild\" { project = var.project_id service = \"cloudbuild.googleapis.com\" }
resource \"google_project_service\" \"artifactregistry\" { project = var.project_id service = \"artifactregistry.googleapis.com\" }
resource \"google_project_service\" \"firestore\" { project = var.project_id service = \"firestore.googleapis.com\" }
resource \"google_artifact_registry_repository\" \"repo\" { project = var.project_id location = var.region repository_id = var.artifact_repo format = \"DOCKER\" depends_on = [google_project_service.artifactregistry] }
output \"public_service_name\" { value = \"${TOOL}-${PUBLIC_SVC_SUFFIX}\" }
output \"admin_service_name\" { value = \"${TOOL}-${ADMIN_SVC_SUFFIX}\" }
" "$FORCE"

  safe_write_file "infra/live/$TOOL/variables.tf" "variable \"project_id\" { type = string default = \"$PROJECT\" }
variable \"region\" { type = string default = \"$REGION\" }
variable \"artifact_repo\" { type = string default = \"$ARTIFACT_REPO\" }
" "$FORCE"

  safe_write_file "infra/live/$TOOL/outputs.tf" "output \"artifact_repo\" { value = var.artifact_repo }
output \"region\" { value = var.region }
output \"project_id\" { value = var.project_id }
" "$FORCE"

  if [[ -f .gitignore ]]; then
    safe_append_unique_block .gitignore "# --- mangu ---" ".env
inventory/*.md
cracklog/*.md"
  else
    safe_write_file .gitignore "# --- mangu ---
.env
inventory/*.md
cracklog/*.md
" "$FORCE"
  fi

  log "Repo standard pack generated."
}

main(){
  need_cmd git
  parse_args "$@"; validate_args
  generate
}

main "$@"
