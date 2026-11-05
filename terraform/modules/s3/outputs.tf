output "vault_bucket_name" {
  value = aws_s3_bucket.vault.bucket
}

output "vault_bucket_arn" {
  value = aws_s3_bucket.vault.arn
}

output "vector_bucket_name" {
  value = aws_s3vectors_vector_bucket.main.vector_bucket_name
}

output "vector_bucket_arn" {
  value = aws_s3vectors_vector_bucket.main.vector_bucket_arn
}
