data "aws_ec2_managed_prefix_list" "cloudfront" {
  name = "com.amazonaws.global.cloudfront.origin-facing"
}

# EC2用セキュリティグループ
resource "aws_security_group" "ec2" {
  name        = "${var.project}-${var.env}-ec2-sg"
  description = "EC2 security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTP from CloudFront only"
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    prefix_list_ids = [data.aws_ec2_managed_prefix_list.cloudfront.id]
  }

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project}-${var.env}-ec2-sg"
    Project = var.project
    Env     = var.env
  }
}

# RDS用セキュリティグループ
resource "aws_security_group" "rds" {
  name        = "${var.project}-${var.env}-rds-sg"
  description = "RDS security group"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "PostgreSQL from EC2"
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project}-${var.env}-rds-sg"
    Project = var.project
    Env     = var.env
  }
}
