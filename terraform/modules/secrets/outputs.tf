output "db_url_arn" {
  value = aws_secretsmanager_secret.db_url.arn
}

output "nextauth_secret_arn" {
  value = aws_secretsmanager_secret.nextauth_secret.arn
}

output "cron_secret_arn" {
  value = aws_secretsmanager_secret.cron_secret.arn
}

output "cognito_client_secret_arn" {
  value = aws_secretsmanager_secret.cognito_client_secret.arn
}

output "google_client_secret_arn" {
  value = aws_secretsmanager_secret.google_client_secret.arn
}

output "read_secrets_policy_arn" {
  value = aws_iam_policy.read_secrets.arn
}
