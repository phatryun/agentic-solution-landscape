terraform {
  required_version = ">= 1.7"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0.0, < 6.69.0"  # 6.x required for aws_s3vectors_* resources
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }

  # Remote backend — uncomment after creating the tfstate bucket:
  #   aws s3 mb s3://genai-landscape-tfstate-<account-id> --region eu-west-1
  #   aws s3api put-bucket-versioning --bucket genai-landscape-tfstate-<account-id> \
  #     --versioning-configuration Status=Enabled
  #   aws s3api put-bucket-encryption --bucket genai-landscape-tfstate-<account-id> \
  #     --server-side-encryption-configuration \
  #     '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
  # backend "s3" {
  #   bucket         = "genai-landscape-tfstate-<account-id>"
  #   key            = "dev/terraform.tfstate"
  #   region         = "eu-west-1"
  #   encrypt        = true
  #   dynamodb_table = "genai-landscape-tfstate-lock"
  # }
}

provider "aws" {
  region  = var.aws_region
  profile = var.aws_profile
  default_tags {
    tags = {
      Project     = var.prefix
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  prefix = "${var.prefix}-${var.environment}"
}

# ── Secrets Manager — all secrets stored here, never in plaintext env vars ───

module "secrets" {
  source                = "../../modules/secrets"
  prefix                = local.prefix
  database_url          = "postgresql://genai_user:${var.db_password}@${module.rds.endpoint}/genai_landscape"
  nextauth_secret       = var.nextauth_secret
  cron_secret           = var.cron_secret
  cognito_client_secret = module.cognito.client_secret
  google_client_secret  = var.google_client_secret
}

# ── VPC — dedicated network, no default VPC ──────────────────────────────────

module "vpc" {
  source     = "../../modules/vpc"
  prefix     = local.prefix
  account_id = data.aws_caller_identity.current.account_id
  region     = var.aws_region
}

# ── Cognito ───────────────────────────────────────────────────────────────────

module "cognito" {
  source               = "../../modules/cognito"
  prefix               = local.prefix
  google_client_id     = var.google_client_id
  google_client_secret = var.google_client_secret
  app_url              = var.app_url
}

# ── RDS — in private subnets of dedicated VPC ─────────────────────────────────

module "rds" {
  source              = "../../modules/rds"
  prefix              = local.prefix
  db_password         = var.db_password
  vpc_id              = module.vpc.vpc_id
  vpc_cidr            = module.vpc.vpc_cidr
  private_subnet_ids  = module.vpc.private_subnet_ids
  deletion_protection = false   # set to true before going live
  skip_final_snapshot = true    # set to false before going live
}

# ── S3 ────────────────────────────────────────────────────────────────────────

module "s3" {
  source = "../../modules/s3"
  prefix = local.prefix
}

# ── Bedrock ───────────────────────────────────────────────────────────────────

module "bedrock" {
  source               = "../../modules/bedrock"
  prefix               = local.prefix
  s3_vault_bucket_arn  = module.s3.vault_bucket_arn
  s3_vector_bucket_arn = module.s3.vector_bucket_arn
}

# ── Lambda ────────────────────────────────────────────────────────────────────

module "lambda" {
  source          = "../../modules/lambda"
  prefix          = local.prefix
  app_url         = var.app_url
  cron_secret_arn = module.secrets.cron_secret_arn  # ARN only — not the value
}

# ── EventBridge ───────────────────────────────────────────────────────────────

module "eventbridge" {
  source              = "../../modules/eventbridge"
  prefix              = local.prefix
  lambda_function_arn = module.lambda.cron_function_arn
}

# ── Amplify ───────────────────────────────────────────────────────────────────

module "amplify" {
  source       = "../../modules/amplify"
  prefix       = local.prefix
  github_repo  = var.github_repo
  github_token = var.github_token

  # Only non-sensitive config here.
  # Secrets are resolved at runtime from Secrets Manager using their ARNs.
  environment_variables = {
    NEXT_PUBLIC_APP_URL       = var.app_url
    AWS_REGION                = var.aws_region
    COGNITO_USER_POOL_ID      = module.cognito.user_pool_id
    COGNITO_CLIENT_ID         = module.cognito.client_id
    COGNITO_ISSUER            = module.cognito.issuer
    S3_VAULT_BUCKET           = module.s3.vault_bucket_name
    S3_VECTOR_BUCKET          = module.s3.vector_bucket_name
    S3_VECTOR_INDEX           = "genai-solutions"
    BEDROCK_AGENT_ID          = module.bedrock.agent_id
    BEDROCK_AGENT_ALIAS_ID    = module.bedrock.agent_alias_id
    BEDROCK_KNOWLEDGE_BASE_ID = module.bedrock.knowledge_base_id
    BEDROCK_MODEL_ID          = "eu.anthropic.claude-sonnet-4-20250514-v1:0"
    NEXTAUTH_URL              = var.app_url

    # ARNs for runtime secret resolution — NOT the secret values
    SM_DATABASE_URL_ARN       = module.secrets.db_url_arn
    SM_NEXTAUTH_SECRET_ARN    = module.secrets.nextauth_secret_arn
    SM_CRON_SECRET_ARN        = module.secrets.cron_secret_arn
    SM_COGNITO_SECRET_ARN     = module.secrets.cognito_client_secret_arn
  }
}
