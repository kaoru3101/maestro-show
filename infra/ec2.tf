data "aws_ami" "amazon_linux_2023" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }
}

resource "aws_instance" "api" {
  ami                    = data.aws_ami.amazon_linux_2023.id
  instance_type          = "t3.micro"
  subnet_id              = aws_subnet.public.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  key_name               = var.ec2_key_name
  iam_instance_profile   = aws_iam_instance_profile.ec2.name

  user_data = <<-EOF
    #!/bin/bash
    dnf update -y
    dnf install -y docker
    systemctl start docker
    systemctl enable docker
    usermod -aG docker ec2-user

    # AWS CLI v2
    dnf install -y unzip
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    ./aws/install

    # ECRからイメージをpullして起動するスクリプト
    cat > /home/ec2-user/start.sh << 'SCRIPT'
    #!/bin/bash
    DB_PASSWORD=$(aws ssm get-parameter \
      --name "/${var.project}/${var.env}/db_password" \
      --with-decryption \
      --query "Parameter.Value" \
      --output text \
      --region ${var.aws_region})

    JWT_SECRET=$(aws ssm get-parameter \
      --name "/${var.project}/${var.env}/jwt_secret" \
      --with-decryption \
      --query "Parameter.Value" \
      --output text \
      --region ${var.aws_region})

    aws ecr get-login-password --region ${var.aws_region} | \
      docker login --username AWS --password-stdin ${aws_ecr_repository.api.repository_url}

    docker pull ${aws_ecr_repository.api.repository_url}:latest

    docker stop tennis-api || true
    docker rm tennis-api || true

    docker run -d \
      --name tennis-api \
      --restart always \
      -p 8080:8080 \
      -e SPRING_DATASOURCE_URL="jdbc:postgresql://${aws_db_instance.main.address}:5432/${aws_db_instance.main.db_name}" \
      -e SPRING_DATASOURCE_USERNAME="${var.db_username}" \
      -e SPRING_DATASOURCE_PASSWORD="$DB_PASSWORD" \
      -e JWT_SECRET="$JWT_SECRET" \
      -e JWT_ACCESS_EXPIRATION="900000" \
      -e JWT_REFRESH_EXPIRATION="604800000" \
      -e AWS_REGION="${var.aws_region}" \
      -e AWS_S3_BUCKET_NAME="${aws_s3_bucket.attachments.bucket}" \
      ${aws_ecr_repository.api.repository_url}:latest
    SCRIPT

    chmod +x /home/ec2-user/start.sh
  EOF

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
  }

  tags = {
    Name    = "${var.project}-${var.env}-api"
    Project = var.project
    Env     = var.env
  }
}

resource "aws_eip" "api" {
  instance = aws_instance.api.id
  domain   = "vpc"

  tags = {
    Name    = "${var.project}-${var.env}-eip"
    Project = var.project
    Env     = var.env
  }
}

# EC2 に ECR・CloudWatch アクセス権限を付与
resource "aws_iam_role" "ec2" {
  name = "${var.project}-${var.env}-ec2-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ec2.amazonaws.com" }
    }]
  })
}

resource "aws_iam_role_policy_attachment" "ec2_ecr" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
}

resource "aws_iam_role_policy_attachment" "ec2_cloudwatch" {
  role       = aws_iam_role.ec2.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"
}

resource "aws_iam_instance_profile" "ec2" {
  name = "${var.project}-${var.env}-ec2-profile"
  role = aws_iam_role.ec2.name
}
