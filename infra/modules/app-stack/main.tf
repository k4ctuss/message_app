locals {
  name_prefix = "${var.app_name}-${var.infra_env}"
}

data "aws_ecr_repository" "app" {
  name = "messaging-app"
}