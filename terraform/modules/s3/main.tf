# ── Vault bucket (Markdown second brain) ─────────────────────────────────────

resource "aws_s3_bucket" "vault" {
  bucket = "${var.prefix}-vault"
}

resource "aws_s3_bucket_versioning" "vault" {
  bucket = aws_s3_bucket.vault.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "vault" {
  bucket = aws_s3_bucket.vault.id
  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "vault" {
  bucket                  = aws_s3_bucket.vault.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── S3 Vectors bucket (vector store) ──────────────────────────────────────────
# S3 Vectors buckets are created via the aws_s3vectors_vector_bucket resource
# (provider aws >= 5.55 / AWS S3 Vectors GA May 2025)

resource "aws_s3vectors_vector_bucket" "main" {
  vector_bucket_name = "${var.prefix}-vectors"

  encryption_configuration {
    sse_type = "AES256"
  }
}

resource "aws_s3vectors_index" "solutions" {
  vector_bucket_name = aws_s3vectors_vector_bucket.main.vector_bucket_name
  index_name         = "genai-solutions"
  data_type          = "float32"
  dimension          = 1024 # Titan Embeddings V2 dimension
  distance_metric    = "cosine"
}
