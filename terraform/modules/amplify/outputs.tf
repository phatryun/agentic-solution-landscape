output "app_url" {
  value = "https://${aws_amplify_branch.main.branch_name}.${aws_amplify_app.main.default_domain}"
}

output "app_id" {
  value = aws_amplify_app.main.id
}

output "branch_name" {
  value = aws_amplify_branch.main.branch_name
}
