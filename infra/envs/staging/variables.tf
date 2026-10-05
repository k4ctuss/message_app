// variables.tf

variable "region" {
	type        = string
	description = "The AWS region the ressources will be deployed (us because its cheaper)"
	default     = "us-east-2"
}

variable instance_size {
    type = string
    description = "ec2 web server size"
    default = "t3.micro"
}

variable "db_instance_type" {
  type = string
  description = "db instance type"
  default = "db.t3.micro"
}

variable "app_name" {
    type = string
    description = "application name"
    default = "app-messaging"
}