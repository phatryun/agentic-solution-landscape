# ── Ephemeral SSM bastion for private-subnet DB access ───────────────────────
# A tiny Graviton instance in a private subnet used only to tunnel to RDS via
# AWS Systems Manager Session Manager (port forwarding). It has:
#   - NO public IP and NO inbound security-group rules (SSM is outbound-only
#     over the NAT gateway)
#   - an instance profile granting only AmazonSSMManagedInstanceCore
# This module is opt-in (enable_bastion) and meant to be destroyed after use.

data "aws_ssm_parameter" "al2023_arm64" {
  name = "/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-default-arm64"
}

# ── IAM role + instance profile (SSM only) ───────────────────────────────────

resource "aws_iam_role" "bastion" {
  name = "${var.prefix}-bastion-ssm"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ssm_core" {
  role       = aws_iam_role.bastion.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "bastion" {
  name = "${var.prefix}-bastion-ssm"
  role = aws_iam_role.bastion.name
}

# ── Security group — no inbound, all outbound (SSM + RDS over VPC) ────────────

resource "aws_security_group" "bastion" {
  name        = "${var.prefix}-bastion-sg"
  description = "Bastion: no inbound, outbound only (SSM via NAT, RDS via VPC)"
  vpc_id      = var.vpc_id

  egress {
    description = "All outbound (HTTPS to SSM endpoints, 5432 to RDS)"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = { Name = "${var.prefix}-bastion-sg" }
}

# ── Instance ──────────────────────────────────────────────────────────────────

resource "aws_instance" "bastion" {
  ami                         = data.aws_ssm_parameter.al2023_arm64.value
  instance_type               = var.instance_type
  subnet_id                   = var.private_subnet_id
  vpc_security_group_ids      = [aws_security_group.bastion.id]
  iam_instance_profile        = aws_iam_instance_profile.bastion.name
  associate_public_ip_address = false

  metadata_options {
    http_tokens   = "required" # IMDSv2 only
    http_endpoint = "enabled"
  }

  root_block_device {
    volume_size = 8
    volume_type = "gp3"
    encrypted   = true
  }

  tags = { Name = "${var.prefix}-bastion" }
}
