resource "aws_ssm_parameter" "db_password" {
  name  = "/${var.project}/${var.env}/db_password"
  type  = "SecureString"
  value = var.db_password

  tags = {
    Name    = "${var.project}-${var.env}-db-password"
    Project = var.project
    Env     = var.env
  }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name  = "/${var.project}/${var.env}/jwt_secret"
  type  = "SecureString"
  value = var.jwt_secret

  tags = {
    Name    = "${var.project}-${var.env}-jwt-secret"
    Project = var.project
    Env     = var.env
  }
}

resource "aws_iam_role_policy" "ec2_ssm" {
  name = "${var.project}-${var.env}-ec2-ssm-policy"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "ssm:GetParameter",
        "ssm:GetParameters"
      ]
      Resource = "arn:aws:ssm:${var.aws_region}:*:parameter/${var.project}/${var.env}/*"
    }]
  })
}
