variable "prefix" { type = string }
variable "app_url" { type = string }
variable "cron_secret_arn" {
  type        = string
  description = "Secrets Manager ARN for the cron secret (not the value)"
}
