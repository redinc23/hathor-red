variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "tool_name" {
  type = string
}

variable "environments" {
  type = list(string)

  validation {
    condition     = alltrue([for env in var.environments : contains(["stg", "prod"], env)])
    error_message = "environments must be a subset of [stg, prod]."
  }
}

variable "firestore_enabled" {
  type = bool
}

variable "enable_admin_plane" {
  type = bool
}

variable "admin_invoker_members" {
  type    = list(string)
  default = []
}

variable "public_allow_unauthenticated" {
  type = map(bool)
}
