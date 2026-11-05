variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "eu-west-1"
}

variable "aws_profile" {
  description = "AWS CLI profile"
  type        = string
  default     = "default"
}

variable "prefix" {
  description = "Resource name prefix"
  type        = string
  default     = "genai-landscape"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "dev"
}

variable "app_url" {
  description = "Public app URL (Amplify URL or custom domain)"
  type        = string
}

variable "google_client_id" {
  description = "Google OAuth client ID"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  sensitive   = true
}

variable "db_password" {
  description = "RDS master password"
  type        = string
  sensitive   = true
}

variable "nextauth_secret" {
  description = "NextAuth secret (openssl rand -base64 32)"
  type        = string
  sensitive   = true
}

variable "cron_secret" {
  description = "Shared secret for cron endpoint protection"
  type        = string
  sensitive   = true
}

variable "github_repo" {
  description = "GitHub repo for Amplify (format: user/repo)"
  type        = string
  default     = ""
}

variable "github_token" {
  description = "GitHub personal access token for Amplify"
  type        = string
  sensitive   = true
  default     = ""
}
