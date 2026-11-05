resource "aws_cloudwatch_event_rule" "daily_scan" {
  name                = "${var.prefix}-daily-scan"
  description         = "Trigger GenAI Landscape daily agent scan"
  schedule_expression = "cron(0 6 * * ? *)" # 6 AM UTC every day
}

resource "aws_cloudwatch_event_target" "lambda" {
  rule      = aws_cloudwatch_event_rule.daily_scan.name
  target_id = "DailyScanLambda"
  arn       = var.lambda_function_arn
}

resource "aws_lambda_permission" "eventbridge" {
  statement_id  = "AllowEventBridgeInvoke"
  action        = "lambda:InvokeFunction"
  function_name = var.lambda_function_arn
  principal     = "events.amazonaws.com"
  source_arn    = aws_cloudwatch_event_rule.daily_scan.arn
}
