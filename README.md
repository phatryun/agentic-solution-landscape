# GenAI Landscape

> The comprehensive, AI-curated map of GenAI & Agentic tooling — grouped by category, updated daily.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Next.js 14 (App Router) — AWS Amplify                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │ Public views │  │ Auth views   │  │ API Routes / tRPC    │  │
│  │ /landscape   │  │ /search      │  │ /api/agent/query     │  │
│  │              │  │ /submit      │  │ /api/submissions     │  │
│  └──────────────┘  └──────────────┘  │ /api/cron/scan       │  │
└─────────────────────────────────────────────────────────────────┘
         │                   │                    │
         ▼                   ▼                    ▼
  Amazon Cognito      RDS PostgreSQL       Bedrock Agent
  (email + Google)    (Prisma ORM)         (Claude 3.5)
                                                  │
                             ┌────────────────────┤
                             ▼                    ▼
                      S3 Vault (.md)      S3 Vectors (KB)
                      Second Brain        Semantic Search
                                         (Titan Embed V2)

  EventBridge (daily cron) → Lambda → POST /api/cron/scan

  MCP Server (stdio) — exposes landscape data to external agents
```

## Stack

| Layer | Technology |
|---|---|
| Frontend / Backend | Next.js 14 + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Auth | Amazon Cognito + NextAuth.js v5 |
| Agent | Amazon Bedrock Agents (Claude 3.5 Sonnet) |
| Embeddings | Amazon Titan Embeddings V2 |
| Vector store | **S3 Vectors** (native AWS, serverless) |
| Second Brain | S3 (Markdown OKF files) |
| Database | Amazon RDS PostgreSQL + Prisma |
| Scheduler | EventBridge + Lambda |
| IaC | Terraform |
| Deployment | AWS Amplify |
| MCP | @modelcontextprotocol/sdk |

## Quick start

```bash
# 1 — First-time setup
make setup

# 2 — Fill in Terraform variables
cp terraform/environments/dev/terraform.tfvars.example \
   terraform/environments/dev/terraform.tfvars
# Edit terraform.tfvars

# 3 — Provision AWS infrastructure
make tf-plan
make tf-apply

# 4 — Upload seed data to S3
make vault-sync

# 5 — Configure local env
cp .env.example .env.local
# Fill in values from: make tf-output

# 6 — Init database
make db-push

# 7 — Run locally
make dev
```

## Vault structure (Second Brain)

```
vault/
├── solutions/          # One .md per tool
│   ├── langchain.md
│   ├── crewai.md
│   └── ...
├── categories/         # One .md per category
│   ├── orchestration.md
│   ├── evaluation.md
│   └── ...
└── index.md
```

Each solution `.md` has a YAML front-matter with structured metadata
(id, name, category, tags, website, github, status, related) and a rich
Markdown body with description, use cases, strengths.

## MCP Server

The MCP server exposes the landscape data to external agents:

```bash
# Build
make mcp-build

# Configure in your MCP client (.kiro/settings/mcp.json)
{
  "mcpServers": {
    "genai-landscape": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"],
      "env": {
        "AWS_REGION": "eu-west-1",
        "S3_VAULT_BUCKET": "genai-landscape-dev-vault",
        "NEXT_PUBLIC_APP_URL": "http://localhost:3000"
      }
    }
  }
}
```

Tools: `list_categories`, `list_solutions`, `get_solution`, `search_solutions`

## Key commands

| Command | Description |
|---|---|
| `make dev` | Start dev server |
| `make tf-plan` | Preview infrastructure changes |
| `make tf-apply` | Provision / update AWS resources |
| `make vault-sync` | Upload vault/ to S3 |
| `make db-push` | Sync Prisma schema to RDS |
| `make secrets-gen` | Generate NEXTAUTH_SECRET + CRON_SECRET |
| `make help` | Show all commands |
