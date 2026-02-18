locals {
  ar_repo = "containers"

  public_services = {
    for env in var.environments :
    env => "${var.tool_name}-public-${env}"
  }

  admin_services = {
    for env in var.environments :
    env => "${var.tool_name}-admin-${env}"
  }

  public_sas = {
    for env in var.environments :
    env => "${var.tool_name}-public-${env}-sa"
  }

  admin_sas = {
    for env in var.environments :
    env => "${var.tool_name}-admin-${env}-sa"
  }
}

resource "google_project_service" "services" {
  for_each = toset(concat([
    "run.googleapis.com",
    "cloudbuild.googleapis.com",
    "artifactregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "logging.googleapis.com",
    "monitoring.googleapis.com"
  ], var.firestore_enabled ? ["firestore.googleapis.com"] : []))

  project = var.project_id
  service = each.value

  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "containers" {
  project       = var.project_id
  location      = var.region
  repository_id = local.ar_repo
  format        = "DOCKER"
  description   = "Container images for ${var.tool_name}"

  depends_on = [google_project_service.services]
}

resource "google_service_account" "public" {
  for_each = local.public_sas

  project      = var.project_id
  account_id   = each.value
  display_name = "Runtime SA: ${each.value}"

  depends_on = [google_project_service.services]
}

resource "google_service_account" "admin" {
  for_each = var.enable_admin_plane ? local.admin_sas : {}

  project      = var.project_id
  account_id   = each.value
  display_name = "Runtime SA: ${each.value}"

  depends_on = [google_project_service.services]
}

resource "google_project_iam_member" "datastore_public" {
  for_each = var.firestore_enabled ? google_service_account.public : {}

  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${each.value.email}"
}

resource "google_project_iam_member" "datastore_admin" {
  for_each = var.firestore_enabled ? google_service_account.admin : {}

  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${each.value.email}"
}

output "artifact_registry_repository" {
  value = google_artifact_registry_repository.containers.name
}

output "runtime_service_accounts" {
  value = {
    public = { for env, sa in google_service_account.public : env => sa.email }
    admin  = { for env, sa in google_service_account.admin : env => sa.email }
  }
}

output "public_service_names" {
  value = local.public_services
}

output "admin_service_names" {
  value = var.enable_admin_plane ? local.admin_services : {}
}
