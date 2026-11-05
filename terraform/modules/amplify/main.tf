resource "aws_amplify_app" "main" {
  name         = var.prefix
  repository   = var.github_repo != "" ? "https://github.com/${var.github_repo}" : null
  access_token = var.github_token != "" ? var.github_token : null

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
          - node_modules/**/*
          - .next/cache/**/*
  YAML

  # Only non-sensitive config is passed as env vars.
  # Secrets are resolved at runtime from Secrets Manager via secret ARNs
  # using the {{resolve:secretsmanager:...}} syntax in the app code.
  environment_variables = var.environment_variables

  platform = "WEB_COMPUTE"

  # Deploy ONLY on push to connected branches (main). Do not auto-create or
  # auto-build any other branch (feature branches, PRs).
  enable_branch_auto_build    = false
  enable_auto_branch_creation = false

  # No SPA fallback rule — conflicts with Next.js SSR WEB_COMPUTE mode.
  # Next.js App Router handles 404s itself via the not-found.tsx convention.
}

resource "aws_amplify_branch" "main" {
  app_id      = aws_amplify_app.main.id
  branch_name = "main"
  framework   = "Next.js - SSR"
  stage       = "PRODUCTION"

  # Auto-deploy this branch on every push/merge to main.
  enable_auto_build = true

  environment_variables = {}
}
