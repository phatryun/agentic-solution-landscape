# ── Amplify app ──────────────────────────────────────────────────────────────
# SSR (WEB_COMPUTE) apps must be deployed via a connected Git provider — Amplify
# does NOT support manual deploys for SSR. We connect a GitHub repository so
# Amplify builds and deploys the Next.js app natively on push to `main`.
#
# github_repo  : https URL of the GitHub repo (e.g. https://github.com/org/app)
# github_token : GitHub Personal Access Token with `repo` + `admin:repo_hook`
#                scopes, passed at apply time (never committed).

locals {
  git_connected = var.github_repo != "" && var.github_token != ""
}

resource "aws_amplify_app" "main" {
  name = var.prefix

  # Connect the GitHub repository for native SSR builds. When no repo/token is
  # provided these are null and the app has no Git connection.
  repository   = local.git_connected ? var.github_repo : null
  access_token = local.git_connected ? var.github_token : null

  platform = "WEB_COMPUTE"

  # Only non-sensitive config is passed as env vars. Secrets are resolved at
  # runtime from Secrets Manager via secret ARNs using the
  # {{resolve:secretsmanager:...}} syntax in the app code.
  environment_variables = var.environment_variables

  # Auto-build on push only when a Git provider is connected.
  enable_branch_auto_build    = local.git_connected
  enable_auto_branch_creation = false

  # Inline build spec for Next.js SSR (also present as amplify.yml in the repo).
  build_spec = <<-YAML
    version: 1
    frontend:
      phases:
        preBuild:
          commands:
            - npm ci
            - npx prisma generate
        build:
          commands:
            - npm run build
      artifacts:
        baseDirectory: .next
        files:
          - '**/*'
      cache:
        paths:
          - .next/cache/**/*
          - node_modules/**/*
  YAML
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.main.id
  branch_name = "main"
  framework   = "Next.js - SSR"
  stage       = "PRODUCTION"

  # Build this branch automatically on push when Git is connected.
  enable_auto_build = local.git_connected

  environment_variables = {}
}
