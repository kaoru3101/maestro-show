resource "aws_db_subnet_group" "main" {
  name       = "${var.project}-${var.env}-db-subnet-group"
  subnet_ids = [aws_subnet.private_a.id, aws_subnet.private_c.id]

  tags = {
    Name    = "${var.project}-${var.env}-db-subnet-group"
    Project = var.project
    Env     = var.env
  }
}

resource "aws_db_instance" "main" {
  identifier        = "${var.project}-${var.env}-db"
  engine            = "postgres"
  engine_version    = "15"
  instance_class    = "db.t3.micro"
  allocated_storage = 20
  storage_type      = "gp2"

  db_name  = "tennisoop"
  username = var.db_username
  password = var.db_password

  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  multi_az            = false
  publicly_accessible = false

  backup_retention_period   = 0
  skip_final_snapshot       = false
  final_snapshot_identifier = "${var.project}-${var.env}-db-final-snapshot"

  tags = {
    Name    = "${var.project}-${var.env}-db"
    Project = var.project
    Env     = var.env
  }
}
