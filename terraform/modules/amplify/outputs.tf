output "app_url" {
  value = "https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.main.default_domain}"
}
