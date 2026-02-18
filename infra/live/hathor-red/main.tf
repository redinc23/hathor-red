terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

module "hathor_red" {
  source = "../../modules/tool"

  project_id = var.project_id
  region     = var.region

  tool_name = "hathor-red"

  environments = ["stg", "prod"]

  firestore_enabled  = true
  enable_admin_plane = true

  admin_invoker_members = [
    "user:renee@mangu-publishers.com"
  ]

  public_allow_unauthenticated = {
    stg  = true
    prod = true
  }
}
