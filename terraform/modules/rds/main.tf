# ── RDS PostgreSQL in dedicated VPC private subnets ──────────────────────────

variable "vpc_id" { type = string }
variable "private_subnet_ids" { type = list(string) }

resource "aws_db_subnet_group" "main" {
  name       = "${var.prefix}-db-subnet"
  subnet_ids = var.private_subnet_ids

  tags = { Name = "${var.prefix}-db-subnet-group" }
}

resource "aws_security_group" "rds" {
  name        = "${var.prefix}-rds-sg"
  description = "Allow PostgreSQL from Lambda and app layer only"
  vpc_id      = var.vpc_id

  ingress {
    description = "PostgreSQL from within VPC"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.vpc_cidr]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_db_instance" "main" {
  identifier              = "${var.prefix}-postgres"
  engine                  = "postgres"
  engine_version          = "16"
  allow_major_version_upgrade = false
  auto_minor_version_upgrade  = true
  instance_class          = "db.t4g.micro"
  allocated_storage       = 20
  max_allocated_storage   = 100
  storage_type            = "gp3"
  storage_encrypted       = true
  db_name                 = "genai_landscape"
  username                = "genai_user"
  password                = var.db_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.rds.id]
  publicly_accessible     = false
  backup_retention_period = 7
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"
  deletion_protection     = var.deletion_protection
  skip_final_snapshot     = var.skip_final_snapshot
  final_snapshot_identifier = var.skip_final_snapshot ? null : "${var.prefix}-final-snapshot"
  copy_tags_to_snapshot   = true

  performance_insights_enabled = true

  lifecycle {
    prevent_destroy = false # set to true in prod via override
  }
}
