resource "aws_cognito_user_pool" "main" {
  name = "${var.prefix}-user-pool"

  auto_verified_attributes = ["email"]

  password_policy {
    minimum_length    = 8
    require_uppercase = true
    require_lowercase = true
    require_numbers   = true
    require_symbols   = true
  }

  account_recovery_setting {
    recovery_mechanism {
      name     = "verified_email"
      priority = 1
    }
  }

  schema {
    attribute_data_type = "String"
    name                = "email"
    required            = true
    mutable             = true
  }

  username_attributes = ["email"]

  # Enforce MFA optional (users can enable it themselves)
  mfa_configuration = "OPTIONAL"
  software_token_mfa_configuration {
    enabled = true
  }
}

resource "aws_cognito_identity_provider" "google" {
  user_pool_id  = aws_cognito_user_pool.main.id
  provider_name = "Google"
  provider_type = "Google"

  provider_details = {
    client_id        = var.google_client_id
    client_secret    = var.google_client_secret
    authorize_scopes = "openid email profile"
  }

  attribute_mapping = {
    email    = "email"
    username = "sub"
    name     = "name"
    picture  = "picture"
  }
}

resource "aws_cognito_user_pool_client" "app" {
  name         = "${var.prefix}-app-client"
  user_pool_id = aws_cognito_user_pool.main.id

  generate_secret                      = true
  allowed_oauth_flows_user_pool_client = true
  allowed_oauth_flows                  = ["code"]
  allowed_oauth_scopes                 = ["email", "openid", "profile"]

  callback_urls = [
    "${var.app_url}/api/auth/callback/cognito",
    "http://localhost:3000/api/auth/callback/cognito",
  ]
  logout_urls = [
    "${var.app_url}",
    "http://localhost:3000",
  ]

  # Google logins are federated through Cognito — no direct Google NextAuth provider
  supported_identity_providers = ["COGNITO", "Google"]

  # ALLOW_USER_PASSWORD_AUTH removed — use SRP only (passwords never travel in plaintext)
  explicit_auth_flows = [
    "ALLOW_USER_SRP_AUTH",
    "ALLOW_REFRESH_TOKEN_AUTH",
  ]

  # Prevent token reuse attacks
  enable_token_revocation = true
  prevent_user_existence_errors = "ENABLED"
}

resource "aws_cognito_user_pool_domain" "main" {
  domain       = var.prefix
  user_pool_id = aws_cognito_user_pool.main.id
}
