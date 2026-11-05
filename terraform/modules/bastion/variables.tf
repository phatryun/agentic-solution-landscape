# ── Bastion module variables ─────────────────────────────────────────────────

variable "prefix" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_id" {
  description = "A private subnet in the same VPC as RDS. The bastion reaches RDS over the VPC CIDR and reaches SSM over the NAT gateway."
  type        = string
}

variable "instance_type" {
  type    = string
  default = "t4g.nano"
}
