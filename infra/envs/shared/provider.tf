terraform {
	required_version = ">= 1.10"

	required_providers {
		aws = {
			source  = "hashicorp/aws"
			version = "~> 6.0"
		}
	}
	backend "s3" {
		bucket       = "messaging-app-backend"
		key          = "messaging-app-shared-tf/terraform.tfstate"
		region       = "us-east-2"
		encrypt      = true
		use_lockfile = true
	}
}
provider "aws" {
    region = "us-east-2"
}