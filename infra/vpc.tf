resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_support   = true
  enable_dns_hostnames = true

  tags = {
    Name    = "${var.project}-${var.env}-vpc"
    Project = var.project
    Env     = var.env
  }
}

resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name    = "${var.project}-${var.env}-igw"
    Project = var.project
    Env     = var.env
  }
}

# Public Subnet（EC2用）
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  availability_zone       = "${var.aws_region}a"
  map_public_ip_on_launch = true

  tags = {
    Name    = "${var.project}-${var.env}-public-subnet"
    Project = var.project
    Env     = var.env
  }
}

# Private Subnet（RDS用）
resource "aws_subnet" "private_a" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = "${var.aws_region}a"

  tags = {
    Name    = "${var.project}-${var.env}-private-subnet-a"
    Project = var.project
    Env     = var.env
  }
}

resource "aws_subnet" "private_c" {
  vpc_id            = aws_vpc.main.id
  cidr_block        = "10.0.3.0/24"
  availability_zone = "${var.aws_region}c"

  tags = {
    Name    = "${var.project}-${var.env}-private-subnet-c"
    Project = var.project
    Env     = var.env
  }
}

resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name    = "${var.project}-${var.env}-public-rt"
    Project = var.project
    Env     = var.env
  }
}

resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.public.id
}
