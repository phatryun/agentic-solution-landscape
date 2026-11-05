data "aws_caller_identity" "current" {}
data "aws_region" "current" {}

locals {
  # Scope IAM to exact model ARNs only — no wildcard
  claude_sonnet_4_arn = "arn:aws:bedrock:${data.aws_region.current.region}::foundation-model/eu.anthropic.claude-sonnet-4-20250514-v1:0"
  titan_embed_arn     = "arn:aws:bedrock:${data.aws_region.current.region}::foundation-model/amazon.titan-embed-text-v2:0"
}

# ── IAM role for Bedrock Agent ────────────────────────────────────────────────

resource "aws_iam_role" "bedrock_agent" {
  name = "${var.prefix}-bedrock-agent-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "bedrock.amazonaws.com" }
      Action    = "sts:AssumeRole"
      Condition = {
        StringEquals = {
          "aws:SourceAccount" = data.aws_caller_identity.current.account_id
        }
        ArnLike = {
          "aws:SourceArn" = "arn:aws:bedrock:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:agent/*"
        }
      }
    }]
  })
}

resource "aws_iam_role_policy" "bedrock_agent" {
  name = "${var.prefix}-bedrock-agent-policy"
  role = aws_iam_role.bedrock_agent.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        # Scoped to exact model ARNs — no wildcard
        Sid      = "InvokeSpecificModels"
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
        Resource = [local.claude_sonnet_4_arn, local.titan_embed_arn]
      },
      {
        Sid      = "ReadVaultBucket"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:ListBucket"]
        Resource = [var.s3_vault_bucket_arn, "${var.s3_vault_bucket_arn}/*"]
      },
      {
        Sid      = "ReadWriteVectorBucket"
        Effect   = "Allow"
        Action   = ["s3vectors:QueryVectors", "s3vectors:PutVectors", "s3vectors:GetVectors"]
        Resource = [var.s3_vector_bucket_arn, "${var.s3_vector_bucket_arn}/*"]
      }
    ]
  })
}

# ── Bedrock Knowledge Base (backed by S3 Vectors) ────────────────────────────

resource "aws_bedrockagent_knowledge_base" "main" {
  name     = "${var.prefix}-kb"
  role_arn = aws_iam_role.bedrock_agent.arn

  knowledge_base_configuration {
    type = "VECTOR"
    vector_knowledge_base_configuration {
      embedding_model_arn = local.titan_embed_arn
    }
  }

  storage_configuration {
    type = "S3_VECTORS"
    s3_vectors_configuration {
      vector_bucket_arn = var.s3_vector_bucket_arn
      index_name        = "genai-solutions"
    }
  }
}

# ── Bedrock Agent ─────────────────────────────────────────────────────────────

resource "aws_bedrockagent_agent" "main" {
  agent_name                  = "${var.prefix}-agent"
  agent_resource_role_arn     = aws_iam_role.bedrock_agent.arn
  foundation_model            = "eu.anthropic.claude-sonnet-4-20250514-v1:0"
  idle_session_ttl_in_seconds = 600

  instruction = <<-EOT
    You are the GenAI Landscape assistant. Your role is to:
    1. Answer questions about GenAI and Agentic tools using the knowledge base.
    2. Perform daily scans of the web for new GenAI tools and return structured JSON.
    3. Evaluate tool submissions from users and provide approve/reject verdicts.

    Always respond with structured, accurate information.
    When scanning for tools, return a JSON array of objects with fields:
    name, website, category, tags (array), description_short.
    Valid categories: orchestration, evaluation, memory, sdk, platform, web-search, data, observability.
    When evaluating submissions, respond ONLY with valid JSON:
    {"verdict":"approve"|"reject"|"needs_review","reason":"string"}
  EOT
}

resource "aws_bedrockagent_agent_knowledge_base_association" "main" {
  agent_id             = aws_bedrockagent_agent.main.agent_id
  description          = "GenAI Landscape knowledge base"
  knowledge_base_id    = aws_bedrockagent_knowledge_base.main.id
  knowledge_base_state = "ENABLED"
}

resource "aws_bedrockagent_agent_alias" "main" {
  agent_alias_name = "live"
  agent_id         = aws_bedrockagent_agent.main.agent_id
}
