variable "prefix" { type = string }
variable "app_url" { type = string }

variable "google_client_id" {
  type      = string
  sensitive = true
}

variable "google_client_secret" {
  type      = string
  sensitive = true
}
