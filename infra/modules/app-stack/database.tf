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
    name       = "${var.app_name}-${var.infra_env}-db-subnet-group"
    subnet_ids = data.aws_subnets.default.ids
    tags = {
            Name        = "${var.infra_env}-db-subnet-group"
            Environment = var.infra_env
    }
}

resource "aws_db_instance" "main" {
    identifier = "${var.app_name}-${var.infra_env}-db-postgres"

    // DB config
    engine            = "postgres"
    engine_version    = "18"
    instance_class    = var.db_instance_type
    allocated_storage = var.allocated_storage
    storage_type      = "gp3"
    storage_encrypted = true

    multi_az = false // to expensive... 

    //auth
    username 					= "postgres"
    manage_master_user_password = true
    db_name = "messaging_db"

    // network config
    db_subnet_group_name   = aws_db_subnet_group.db.name
    vpc_security_group_ids = [aws_security_group.db.id]
    publicly_accessible    = false

    // backup
    backup_retention_period = var.backup_retention_period
    backup_window           = "03:00-04:00"
    maintenance_window      = "mon:04:00-mon:05:00"

    skip_final_snapshot = var.infra_env =="prod" ? false : true
    final_snapshot_identifier = var.infra_env == "prod" ? "${var.app_name}-${var.infra_env}-final" : null

    deletion_protection = var.deletion_protection

    tags = {
        Name        = "${var.app_name}-${var.infra_env}-db-postgres"
        Environment = var.infra_env
    }
}