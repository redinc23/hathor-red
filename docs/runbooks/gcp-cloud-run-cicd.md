# GCP Cloud Run CI/CD Wiring Checklist

## 1) Bootstrap infrastructure

```bash
chmod +x scripts/gcp-bootstrap.sh
PROJECT_ID="encoded-shape-487615-b1" REGION="us-central1" bash scripts/gcp-bootstrap.sh
```

## 2) Link repo in Developer Connect

1. Console → Developer Connect
2. Open `github-publishing-hub` in `us-central1`
3. Link this GitHub repository
4. Approve GitHub App installation

## 3) Create Cloud Build triggers

- `hathor-red-pr`: Pull request on `^main$` using `cloudbuild.ci.yaml`
- `hathor-red-stg`: Push to `^develop$` using `cloudbuild.cd.stg.yaml`
- `hathor-red-prod`: Push to `^main$` using `cloudbuild.cd.prod.yaml`

## 4) Branch protection

- `main`: PR required, status checks required, 1 approval, direct pushes blocked
- `develop`: status checks required (approval optional)

## 5) Staging access policy

`cloudbuild.cd.stg.yaml` intentionally deploys without `--allow-unauthenticated` so staging can be private.

Grant explicit invoker access after first staging deploy:

```bash
PROJECT_ID="encoded-shape-487615-b1"
REGION="us-central1"
SERVICE_STG="hathor-red-stg"

gcloud run services add-iam-policy-binding "$SERVICE_STG" \
  --region="$REGION" \
  --member="user:user@example.com" \
  --role="roles/run.invoker"
```

## 6) Uptime checks

- Ensure `/healthz` returns HTTP 200
- Add uptime checks for production URL
- Add staging URL check only if staging is public

## 7) Post-deploy verification

```bash
PROJECT_ID="encoded-shape-487615-b1"
REGION="us-central1"

gcloud run services list --region="$REGION"
gcloud run services describe hathor-red-prod --region="$REGION" --format="value(status.url)"
gcloud run services describe hathor-red-stg  --region="$REGION" --format="value(status.url)"
```

## 8) Blocker check

```bash
git remote -v
git branch --show-current
```

If `origin` is missing, set a GitHub remote before Developer Connect setup.
