# Template Factory Bootstrap

This repo now includes an idempotent initializer script to stamp baseline platform controls into any repo in under 10 minutes.

## Command

```bash
scripts/mangu-repo-init.sh --target /path/to/repo --with-service-skeleton
```

## What it creates

- `docs/crack-log.md`
- `docs/decisions/adr-0001-template.md`
- `docs/runbooks/{incident-response.md,rollback.md}`
- `cloudbuild.ci.yaml`
- `cloudbuild.cd.stg.yaml` (deploys `public-stg` + `admin-stg`, then enforces admin IAM invoker)
- `cloudbuild.cd.prod.yaml` (deploys `public-prod` + `admin-prod`, then enforces admin IAM invoker)
- `.dockerignore` defaults
- `.env.example` baseline
- optional `services/public-api` + `services/admin-api` skeletons

## Environment example generator

```bash
scripts/generate-env-example.sh stg > .env.example
scripts/generate-env-example.sh prod > .env.example
```

## Notes

- Script is idempotent: existing files are not overwritten.
- Admin services are deployed with `--no-allow-unauthenticated` and IAM binding for `_ADMIN_MEMBER`.
