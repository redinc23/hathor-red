# CI/CD Setup Guide for Hathor Red

This document provides instructions for setting up and verifying the CI/CD pipeline using Google Cloud Build and Cloud Run.

## 1. GitHub Branch Protection Rules

Ensure the following rules are configured in the GitHub repository settings:

### `main` branch
- **Require a pull request before merging**: Enabled
- **Require approvals**: 1
- **Require status checks to pass before merging**: Enabled
  - Required checks: `hathor-red-ci` (Cloud Build check)
- **Block direct pushes**: Enabled

### `develop` branch
- **Require status checks to pass before merging**: Enabled

## 2. GCP Developer Connect Setup

To connect this repository to GCP and automate deployments:

1.  **Enable APIs**: Enable the `Developer Connect API` and `Cloud Build API` in your GCP project.
2.  **Developer Connect**:
    - Go to **Developer Connect** in the GCP Console (Region: `us-central1`).
    - Click **Create Connection**.
    - Select **GitHub** as the provider.
    - Follow the prompts to authorize Google Cloud and install the **Google Cloud Build** app on your GitHub account/organization for the `redinc23/hathor-red` repository.
    - Link the repository to the connection.

## 3. Cloud Build Triggers

Create the following triggers in **Cloud Build** -> **Triggers** (Region: `us-central1`):

### CI Trigger (Pull Requests)
- **Name**: `hathor-red-ci`
- **Event**: Pull Request
- **Source**: `redinc23/hathor-red` repository
- **Base branch**: `^main$`
- **Configuration**: Cloud Build configuration file
- **Cloud Build configuration file location**: `cloudbuild/ci.yaml`

### Staging CD Trigger (Develop)
- **Name**: `hathor-red-cd-stg`
- **Event**: Push to a branch
- **Source**: `redinc23/hathor-red` repository
- **Branch**: `^develop$`
- **Configuration**: Cloud Build configuration file
- **Cloud Build configuration file location**: `cloudbuild/cd.stg.yaml`

### Production CD Trigger (Main)
- **Name**: `hathor-red-cd-prod`
- **Event**: Push to a branch
- **Source**: `redinc23/hathor-red` repository
- **Branch**: `^main$`
- **Configuration**: Cloud Build configuration file
- **Cloud Build configuration file location**: `cloudbuild/cd.prod.yaml`

## 4. Verification Commands

Use the following `gcloud` commands to verify the setup:

### Verify Cloud Run Services
```bash
# List all services in the region
gcloud run services list --region us-central1

# Describe staging service
gcloud run services describe hathor-red-stg --region us-central1

# Describe production service
gcloud run services describe hathor-red-prod --region us-central1
```

### Verify Cloud Build Triggers
```bash
# List all triggers
gcloud builds triggers list --region us-central1
```

## 5. Docker Tagging Strategy

All build steps are configured to tag images as:
`gcr.io/$PROJECT_ID/hathor-red:$COMMIT_SHA`
