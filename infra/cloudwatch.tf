resource "aws_cloudwatch_log_group" "api" {
  name              = "/tennisoop/${var.env}/api"
  retention_in_days = 7

  tags = {
    Project = var.project
    Env     = var.env
  }
}
