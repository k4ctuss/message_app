output "db_endpoint" {
  value     = module.app-stack.db_endpoint
  sensitive = true
}

output "db_address" {
  value     = module.app-stack.db_address
  sensitive = true
}

output "db_name" {
  value     = module.app-stack.db_name
  sensitive = true
}

output "db_secret_arn" {
  value = module.app-stack.db_secret_arn # pointeur vers le secret, pas le secret lui-même
}

output "vpc_id" {
  value = module.app-stack.vpc_id
}

output "instance_id" {
  value = module.app-stack.instance_id
}

output "app_url" {
  value = module.app-stack.app_url
}