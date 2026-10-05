output "db_endpoint" {
  description = "RDS database endpoint"
  value       = aws_db_instance.main.endpoint
  sensitive   = true
}

output "db_address" {
  description = "RDS database address"
  value       = aws_db_instance.main.address
  sensitive   = true
}

output "db_name" {
	description = "RDS database name"
  	value       = aws_db_instance.main.db_name
	sensitive = true
}

output "db_secret_arn" {
  value = aws_db_instance.main.master_user_secret[0].secret_arn   # pointeur vers le secret, pas le secret lui-même
}

output "vpc_id" {
  description = "VPC ID"
  value       = data.aws_vpc.default.id
}

output "instance_id" {
	description = "EC2 instance id"
	value = aws_instance.app.id
}

output "app_url" {
	description = "Url to access the application"
	value       = "http://${aws_instance.app.public_ip}:80"
}