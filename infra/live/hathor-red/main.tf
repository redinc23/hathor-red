terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# Hook your existing module here.
# Replace source + variables with your real module interface.
module "hathor_red" {
  source     = "../../modules/hathor-red" # <-- adjust
  project_id = var.project_id
  region     = var.region
}

output "cloud_run_services" {
  value = try(module.hathor_red.cloud_run_services, null)
}

output "runtime_service_accounts" {
  value = try(module.hathor_red.runtime_service_accounts, null)
}
