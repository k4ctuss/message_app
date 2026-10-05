variable "infra_env" {
	type = string
	description = "infrastructure environment"
}

variable "app_name" {
	type = string
	description = "infrastructure purpose, application name (used in infrastucture environment)"
}

variable "instance_ami" {
	type = string
	description = "instance AMI"
}

variable "instance_type" {
	type = string
	description = "instance type"
	default = "t3.micro"
}

variable "root_volume_size" {
	type = number
	description = "root volume size in GB"
	default = 10
}

variable "db_instance_type" {
	type = string
	description = "db instance type"
	default = "db.t3.micro"
}

// 20 Go is the min for gp3
variable "allocated_storage" {
	type = number
	description = "allocated storage in GB"
	default = 20
}

variable "deletion_protection" {
	type = bool
	description = "deletion protection"
	default = true
}

variable "backup_retention_period" {
	type = number
	description = "backup retention period"
	default = 7
}

variable "app_ingress_cidr" {	
	type = string
	description = "List of CIDR blocks for the app ingress"
	default = "0.0.0.0/0"
}
