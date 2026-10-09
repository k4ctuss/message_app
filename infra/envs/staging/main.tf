data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"]

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-*-26.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }

  filter {
    name   = "architecture"
    values = ["x86_64"]
  }

  filter {
    name   = "state"
    values = ["available"]
  }
}

data "aws_kms_key" "shared" {
  key_id = "alias/messaging-app-shared"
}

module "app-stack" {
  source = "../../modules/app-stack"

  infra_env               = "staging"
  app_name                = var.app_name
  kms_key_id              = data.aws_kms_key.shared.arn
  instance_ami            = data.aws_ami.ubuntu.id
  instance_type           = var.instance_size
  root_volume_size        = 20
  db_instance_type        = var.db_instance_type
  allocated_storage       = 20
  deletion_protection     = false
  backup_retention_period = 1
}