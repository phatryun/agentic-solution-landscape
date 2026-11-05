# ── AWS Secrets Manager — centralise all app secrets ─────────────────────────
# Secrets are stored here and resolved at runtime via SSM/Secrets Manager.
# Amplify env vars only receive secret ARNs, never plaintext values.

resource "aws_secretsmanager_secret" "db_url" {
  name                    = "${var.prefix}/database-url"
  description             = "RDS PostgreSQL connection string for genai-landscape"
  recovery_window_in_days = 7

  tags = {
    Name = "${var.prefix}-db-url"
  }
}

resource "aws_secretsmanager_secret_version" "db_url" {
  secret_id     = aws_secretsmanager_secret.db_url.id
  secret_string = var.database_url
}

resource "aws_secretsmanager_secret" "nextauth_secret" {
  name                    = "${var.prefix}/nextauth-secret"
  description             = "NextAuth.js signing secret"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "nextauth_secret" {
  secret_id     = aws_secretsmanager_secret.nextauth_secret.id
  secret_string = var.nextauth_secret
}

resource "aws_secretsmanager_secret" "cron_secret" {
  name                    = "${var.prefix}/cron-secret"
  description             = "Shared secret for cron endpoint protection"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "cron_secret" {
  secret_id     = aws_secretsmanager_secret.cron_secret.id
  secret_string = var.cron_secret
}

resource "aws_secretsmanager_secret" "cognito_client_secret" {
  name                    = "${var.prefix}/cognito-client-secret"
  description             = "Cognito App Client secret"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "cognito_client_secret" {
  secret_id     = aws_secretsmanager_secret.cognito_client_secret.id
  secret_string = var.cognito_client_secret
}

resource "aws_secretsmanager_secret" "google_client_secret" {
  name                    = "${var.prefix}/google-client-secret"
  description             = "Google OAuth client secret"
  recovery_window_in_days = 7
}

resource "aws_secretsmanager_secret_version" "google_client_secret" {
  secret_id     = aws_secretsmanager_secret.google_client_secret.id
  secret_string = var.google_client_secret
}

# ── IAM policy for Amplify/Lambda to read secrets ────────────────────────────

resource "aws_iam_policy" "read_secrets" {
  name        = "${var.prefix}-read-secrets"
  description = "Allow reading genai-landscape secrets from Secrets Manager"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret"
        ]
        Resource = [
          aws_secretsmanager_secret.db_url.arn,
          aws_secretsmanager_secret.nextauth_secret.arn,
          aws_secretsmanager_secret.cron_secret.arn,
          aws_secretsmanager_secret.cognito_client_secret.arn,
          aws_secretsmanager_secret.google_client_secret.arn,
        ]
      }
    ]
  })
}
