output "ec2_public_ip" {
  description = "EC2のパブリックIPアドレス（Elastic IP）"
  value       = aws_eip.api.public_ip
}

output "ec2_public_dns" {
  description = "EC2のパブリックDNS"
  value       = aws_instance.api.public_dns
}

output "rds_endpoint" {
  description = "RDSのエンドポイント"
  value       = aws_db_instance.main.address
}

output "ecr_repository_url" {
  description = "ECRリポジトリのURL"
  value       = aws_ecr_repository.api.repository_url
}

output "api_url" {
  description = "APIのURL（直接）"
  value       = "http://${aws_eip.api.public_ip}:8080"
}

output "cloudfront_url" {
  description = "CloudFront経由のAPIのURL（HTTPS）"
  value       = "https://${aws_cloudfront_distribution.api.domain_name}"
}

output "s3_bucket_name" {
  description = "添付ファイル用S3バケット名"
  value       = aws_s3_bucket.attachments.bucket
}
