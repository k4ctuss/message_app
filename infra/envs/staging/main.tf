data "aws_ami" "ubuntu" {
  most_recent = true
  owners = ["099720109477"]

  filter {
    name = "name"
    values = ["ubuntu/images/hvm-ssd/ubuntu-*-26.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }
}

module "app-stack" {
  source = "../../modules/app-stack"

  infra_env = "staging"
  app_name = var.app_name
  instance_ami = data.aws_ami.ubuntu.id
  instance_type = var.instance_size
  root_volume_size = 10
  db_instance_type = var.db_instance_type
  allocated_storage = 10
  deletion_protection = true
  backup_retention_period = 1
}