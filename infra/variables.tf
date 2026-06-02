variable "aws_region" {
  description = "AWSリージョン"
  type        = string
  default     = "ap-northeast-1"
}

variable "project" {
  description = "プロジェクト名"
  type        = string
  default     = "tennisoop"
}

variable "env" {
  description = "環境名"
  type        = string
  default     = "develop"
}

variable "db_username" {
  description = "RDSのユーザー名"
  type        = string
  default     = "tennisoop"
}

variable "db_password" {
  description = "RDSのパスワード"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWTシークレットキー"
  type        = string
  sensitive   = true
}

variable "ec2_key_name" {
  description = "EC2キーペア名"
  type        = string
}
