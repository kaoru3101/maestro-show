resource "aws_s3_bucket" "attachments" {
  bucket = "${var.project}-${var.env}-attachments"

  tags = {
    Name    = "${var.project}-${var.env}-attachments"
    Project = var.project
    Env     = var.env
  }
}

resource "aws_s3_bucket_public_access_block" "attachments" {
  bucket = aws_s3_bucket.attachments.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_iam_role_policy" "ec2_s3" {
  name = "${var.project}-${var.env}-ec2-s3-policy"
  role = aws_iam_role.ec2.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ]
      Resource = [
        aws_s3_bucket.attachments.arn,
        "${aws_s3_bucket.attachments.arn}/*"
      ]
    }]
  })
}
