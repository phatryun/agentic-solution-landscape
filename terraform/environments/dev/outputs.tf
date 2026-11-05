output "cognito_user_pool_id" {
  value = module.cognito.user_pool_id
}

output "cognito_client_id" {
  value = module.cognito.client_id
}

output "cognito_issuer" {
  value = module.cognito.issuer
}

output "rds_endpoint" {
  value = module.rds.endpoint
}

output "s3_vault_bucket" {
  value = module.s3.vault_bucket_name
}

output "s3_vector_bucket" {
  value = module.s3.vector_bucket_name
}

output "amplify_app_url" {
  value = module.amplify.app_url
}

output "bedrock_agent_id" {
  value = module.bedrock.agent_id
}
