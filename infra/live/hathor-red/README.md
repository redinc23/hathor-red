# Hathor Red — Live Infra (Terraform)

Run from **Cloud Shell**.

```bash
cd infra/live/hathor-red
terraform init
terraform plan
terraform apply
```

## What this should manage

- Cloud Run services + runtime service accounts (per env/service)
- IAM policies (public for public-*, private for admin-*)
- Firestore (database) + IAM for runtime SAs
- Cloud Build triggers (PR CI, develop→stg, main→prod) OR document if deferred
- Monitoring uptime check + alert policy OR document if deferred

## Outputs that CD/ops should consume

- service names
- service URLs
- runtime SA emails
- trigger IDs
- uptime check IDs
