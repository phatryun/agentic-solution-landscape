variable "prefix" {
  type = string
}

variable "database_url" {
  type      = string
  sensitive = true
}

variable "nextauth_secret" {
  type      = string
  sensitive = true
}

variable "cron_secret" {
  type      = string
  sensitive = true
}

variable "cognito_client_secret" {
  type      = string
  sensitive = true
}

variable "google_client_secret" {
  type      = string
  sensitive = true
}
