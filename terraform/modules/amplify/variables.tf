variable "prefix" { type = string }

variable "github_repo" {
  type    = string
  default = ""
}

variable "github_token" {
  type      = string
  sensitive = true
  default   = ""
}

variable "environment_variables" {
  type    = map(string)
  default = {}
}
