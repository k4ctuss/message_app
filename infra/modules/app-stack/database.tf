/* AWS required 2AZ subnets for RDS
 We use the default subnets for the RDS instance but for a better security 
 we should create our own vpc and then the gateway, route table and subnets
 */
data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_db_subnet_group" "db" {
  name       = "${local.name_prefix}-db-subnet-group"
  subnet_ids = data.aws_subnets.default.ids
  tags = {
    Name        = "${var.infra_env}-db-subnet-group"
    Environment = var.infra_env
  }
}

resource "aws_db_parameter_group" "main" {
  name   = "${local.name_prefix}-db-parameters"
  family = "postgres18"

  parameter {
    name  = "log_statement"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = "0"
  }

  tags = {
    Name        = "${local.name_prefix}-db-parameters"
    Environment = var.infra_env
  }
}

resource "aws_db_instance" "main" {
  # Checkov exceptions: these availability, exposure, and monitoring choices
  # are intentionally retained to avoid changing the existing deployment.
  # checkov:skip=CKV_AWS_353:Performance Insights would add monitoring cost and is not part of this environment.
  # checkov:skip=CKV_AWS_161:IAM database authentication is not used by the existing application connection.
  # checkov:skip=CKV_AWS_157:Multi-AZ is intentionally disabled to avoid the additional database standby cost.
  # checkov:skip=CKV_AWS_293:Deletion protection is controlled per environment and remains unchanged.
  # checkov:skip=CKV_AWS_118:Enhanced monitoring would add an IAM role and monitoring cost without changing the deployment.
  # checkov:skip=CKV2_AWS_69:Enforcing SSL in transit requires an application connection change and is intentionally deferred.
  identifier = "${local.name_prefix}-db-postgres"

  // DB config
  engine                          = "postgres"
  engine_version                  = "18"
  instance_class                  = var.db_instance_type
  allocated_storage               = var.allocated_storage
  storage_type                    = "gp3"
  storage_encrypted               = true
  auto_minor_version_upgrade      = true
  enabled_cloudwatch_logs_exports = ["postgresql", "upgrade"]
  copy_tags_to_snapshot           = true
  parameter_group_name            = aws_db_parameter_group.main.name

  multi_az = false // to expensive...

  //auth
  username                    = "postgres"
  manage_master_user_password = true
  db_name                     = "messaging_db"

  // network config
  db_subnet_group_name   = aws_db_subnet_group.db.name
  vpc_security_group_ids = [aws_security_group.db.id]
  publicly_accessible    = false

  // backup
  backup_retention_period = var.backup_retention_period
  backup_window           = "03:00-04:00"
  maintenance_window      = "mon:04:00-mon:05:00"

  skip_final_snapshot       = var.infra_env == "prod" ? false : true
  final_snapshot_identifier = var.infra_env == "prod" ? "${local.name_prefix}-final" : null

  deletion_protection = var.deletion_protection

  tags = {
    Name        = "${local.name_prefix}-db-postgres"
    Environment = var.infra_env
  }
}