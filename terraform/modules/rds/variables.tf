variable "prefix" { type = string }

variable "db_password" {
  type      = string
  sensitive = true
}

variable "vpc_cidr" { type = string }

variable "deletion_protection" {
  type        = bool
  default     = false
  description = "Set to true for production to prevent accidental deletion"
}

variable "skip_final_snapshot" {
  type        = bool
  default     = true
  description = "Set to false for production to retain final snapshot on deletion"
}
