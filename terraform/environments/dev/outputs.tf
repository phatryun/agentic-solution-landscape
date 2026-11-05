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

output "rds_address" {
  value = module.rds.address
}

output "rds_port" {
  value = module.rds.port
}

output "bastion_instance_id" {
  value = var.enable_bastion ? module.bastion[0].instance_id : null
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

output "amplify_app_id" {
  value = module.amplify.app_id
}

output "amplify_branch_name" {
  value = module.amplify.branch_name
}

output "bedrock_agent_id" {
  value = var.enable_bedrock ? module.bedrock[0].agent_id : null
}
