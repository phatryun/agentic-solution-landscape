data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

# ── IAM role for Lambda ───────────────────────────────────────────────────────

resource "aws_iam_role" "lambda" {
  name = "${var.prefix}-lambda-cron-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })
}

# Scoped to specific log group — not logs:* on *
resource "aws_cloudwatch_log_group" "lambda" {
  name              = "/aws/lambda/${var.prefix}-daily-scan"
  retention_in_days = 30
}

resource "aws_iam_role_policy" "lambda_logs" {
  name = "${var.prefix}-lambda-logs-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "WriteLogs"
        Effect = "Allow"
        Action = [
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        # Scoped to this Lambda's log group only
        Resource = "${aws_cloudwatch_log_group.lambda.arn}:*"
      }
    ]
  })
}

# Allow Lambda to read the cron secret from Secrets Manager
resource "aws_iam_role_policy" "lambda_secrets" {
  name = "${var.prefix}-lambda-secrets-policy"
  role = aws_iam_role.lambda.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid    = "ReadCronSecret"
      Effect = "Allow"
      Action = ["secretsmanager:GetSecretValue"]
      Resource = var.cron_secret_arn
    }]
  })
}

# ── Lambda function — triggers the daily scan ─────────────────────────────────

data "archive_file" "cron" {
  type        = "zip"
  output_path = "${path.module}/cron.zip"
  source {
    content  = <<-JS
      const https = require('https');
      const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

      exports.handler = async () => {
        // Resolve cron secret from Secrets Manager at runtime (never stored in env vars)
        const sm = new SecretsManagerClient({ region: process.env.AWS_REGION });
        const { SecretString } = await sm.send(
          new GetSecretValueCommand({ SecretId: process.env.CRON_SECRET_ARN })
        );

        const url = new URL(process.env.APP_URL + '/api/cron/scan');

        return new Promise((resolve, reject) => {
          const req = https.request(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-cron-secret': SecretString,
            },
          }, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
              console.log('Scan response:', res.statusCode, body);
              resolve({ statusCode: res.statusCode, body });
            });
          });
          req.on('error', reject);
          req.end();
        });
      };
    JS
    filename = "index.js"
  }
}

resource "aws_lambda_function" "cron" {
  function_name    = "${var.prefix}-daily-scan"
  filename         = data.archive_file.cron.output_path
  source_code_hash = data.archive_file.cron.output_base64sha256
  role             = aws_iam_role.lambda.arn
  handler          = "index.handler"
  runtime          = "nodejs20.x"
  timeout          = 300

  environment {
    variables = {
      APP_URL         = var.app_url
      CRON_SECRET_ARN = var.cron_secret_arn  # ARN, not the secret value
      AWS_REGION      = data.aws_region.current.region
    }
  }

  depends_on = [aws_cloudwatch_log_group.lambda]
}
