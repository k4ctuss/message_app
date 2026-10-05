terraform {
	required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.0"
    }
  }
  backend "s3" {
    bucket       = "messaging-app-backend"
    key          = "${var.app_name}-prod-tf/terraform.tfstate"
    region       = var.region
    encrypt      = true
    use_lockfile = true
  }
}
provider "aws" {
    region = var.region
}