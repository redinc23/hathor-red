# tool module

Reusable baseline for Mangu tool infrastructure.

## What this module manages

- Required project APIs (Cloud Run, Cloud Build, Artifact Registry, Secrets, Logging, Monitoring, optional Firestore)
- Artifact Registry Docker repository (`containers`)
- Runtime service accounts for public/admin planes per environment
- Firestore runtime IAM (`roles/datastore.user`) when enabled

## What this module intentionally does not manage yet

- Cloud Run service objects (usually managed by CD image deploy)
- Cloud Build GitHub/Developer Connect OAuth linkage
- Cloud Build trigger objects (repo connector-dependent)

## Imports for existing resources

When existing resources are already provisioned by manual/CI paths, import them before apply:

```bash
terraform import 'module.hathor_red.google_artifact_registry_repository.containers' \
  "projects/${PROJECT_ID}/locations/${REGION}/repositories/containers"
```

Service accounts follow:
`projects/${PROJECT_ID}/serviceAccounts/<account>@${PROJECT_ID}.iam.gserviceaccount.com`
