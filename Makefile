SHELL := /bin/zsh
TF_DIR := terraform/environments/dev
AWS_PROFILE ?= default
AWS_REGION  ?= eu-west-1

.PHONY: help install dev build lint \
        tf-init tf-plan tf-apply tf-destroy tf-output \
        db-migrate db-push db-studio \
        vault-sync mcp-build \
        secrets-gen

## ── Help ──────────────────────────────────────────────────────────────────────

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

## ── App ───────────────────────────────────────────────────────────────────────

install: ## Install Node dependencies
	npm install
	cd mcp-server && npm install

dev: ## Start Next.js dev server
	npm run dev

build: ## Build Next.js for production
	npm run build

lint: ## Run ESLint
	npm run lint

## ── Database ──────────────────────────────────────────────────────────────────

db-migrate: ## Run Prisma migrations (dev)
	npm run db:migrate

db-push: ## Push Prisma schema to DB (no migration)
	npm run db:push

db-studio: ## Open Prisma Studio
	npm run db:studio

## ── Terraform ─────────────────────────────────────────────────────────────────

tf-init: ## Initialise Terraform
	cd $(TF_DIR) && terraform init -upgrade

tf-plan: ## Plan Terraform changes
	cd $(TF_DIR) && AWS_PROFILE=$(AWS_PROFILE) terraform plan

tf-apply: ## Apply Terraform changes
	cd $(TF_DIR) && AWS_PROFILE=$(AWS_PROFILE) terraform apply

tf-destroy: ## Destroy all Terraform resources (DESTRUCTIVE)
	@echo "⚠️  This will DESTROY all AWS resources. Press Ctrl+C to cancel."
	@sleep 5
	cd $(TF_DIR) && AWS_PROFILE=$(AWS_PROFILE) terraform destroy

tf-output: ## Show Terraform outputs
	cd $(TF_DIR) && terraform output

## ── Vault ─────────────────────────────────────────────────────────────────────

vault-sync: ## Upload local vault/ folder to S3
	@BUCKET=$$(cd $(TF_DIR) && terraform output -raw s3_vault_bucket 2>/dev/null); \
	if [ -z "$$BUCKET" ]; then echo "❌ Run make tf-apply first"; exit 1; fi; \
	echo "📤 Syncing vault/ to s3://$$BUCKET ..."; \
	AWS_PROFILE=$(AWS_PROFILE) aws s3 sync vault/ s3://$$BUCKET/ \
		--delete --region $(AWS_REGION); \
	echo "✅ Vault synced"

## ── MCP Server ────────────────────────────────────────────────────────────────

mcp-build: ## Build MCP server
	cd mcp-server && npm run build

## ── Secrets ───────────────────────────────────────────────────────────────────

secrets-gen: ## Generate random secrets (NEXTAUTH_SECRET, CRON_SECRET)
	@echo "NEXTAUTH_SECRET=$$(openssl rand -base64 32)"
	@echo "CRON_SECRET=$$(openssl rand -hex 32)"

## ── Setup ─────────────────────────────────────────────────────────────────────

setup: ## Full first-time setup: install deps + init terraform
	@echo "1️⃣  Installing Node dependencies..."
	$(MAKE) install
	@echo "2️⃣  Initialising Terraform..."
	$(MAKE) tf-init
	@echo ""
	@echo "✅ Setup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. cp terraform/environments/dev/terraform.tfvars.example terraform/environments/dev/terraform.tfvars"
	@echo "  2. Edit terraform.tfvars with your values"
	@echo "  3. make tf-plan   — preview changes"
	@echo "  4. make tf-apply  — provision AWS resources"
	@echo "  5. make vault-sync — upload seed data to S3"
	@echo "  6. cp .env.example .env.local && fill in values from tf-output"
	@echo "  7. make db-push"
	@echo "  8. make dev"
