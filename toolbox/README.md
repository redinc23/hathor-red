# Toolbox Container

Use this image when you are not in Google Cloud Shell but still need the full operator toolchain (`gcloud`, `terraform`, `jq`, `bash`, `curl`).

Cloud Shell remains the canonical operator path for GCP actions.

## Build

```bash
make toolbox
```

## Open a shell in the toolbox

```bash
make toolbox-shell
```

## Authenticate gcloud inside the container

```bash
gcloud auth login
gcloud auth application-default login
```

If you're running in CI, prefer service-account credentials via workload identity or keyless auth.
