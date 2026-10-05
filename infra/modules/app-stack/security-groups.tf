data "aws_vpc" "default" {
    default = true
}

// Security group for the app
resource "aws_security_group" "app" {
    name = "${local.name_prefix}-sg-app"
    description = "Security group for the app"
    vpc_id = data.aws_vpc.default.id

    tags = {
      Name = "${local.name_prefix}-sg-app"
      Environment = var.infra_env
      TerraformManaged = "true"
    }
}

// Allow HTTP traffic from the ingress CIDR blocks
resource "aws_vpc_security_group_ingress_rule" "allow_HTTP_traffic" {
    security_group_id = aws_security_group.app.id
    ip_protocol = "tcp"
    from_port = 80
    to_port = 80
    cidr_ipv4 = var.app_ingress_cidr
}

// Allow HTTPS traffic from the ingress CIDR blocks
resource "aws_vpc_security_group_ingress_rule" "allow_HTTPS_traffic" {
    security_group_id = aws_security_group.app.id
    ip_protocol = "tcp"
    from_port = 443
    to_port = 443
    cidr_ipv4 = var.app_ingress_cidr
}

// Allow all traffic from the app to the internet
resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_ipv4" {
    security_group_id = aws_security_group.app.id
    cidr_ipv4         = "0.0.0.0/0"
    ip_protocol       = "-1" # semantically equivalent to all ports
}

// Allow all traffic from the app to the internet
resource "aws_vpc_security_group_egress_rule" "allow_all_traffic_ipv6" {
    security_group_id = aws_security_group.app.id
    cidr_ipv6         = "::/0"
    ip_protocol       = "-1" # semantically equivalent to all ports
}

// security group for the database
resource "aws_security_group" "db" {
    name = "${local.name_prefix}-sg-db"
    description = "Security group for the database"
    vpc_id = data.aws_vpc.default.id

    tags = {
        Name = "${local.name_prefix}-sg-db"
        Environment = var.infra_env
        TerraformManaged = "true"
    }
}

// Only allow incoming traffic from the app 
resource "aws_vpc_security_group_ingress_rule" "db_from_app" {
    security_group_id = aws_security_group.db.id
    ip_protocol = "tcp"
    from_port = 5432
    to_port = 5432
    referenced_security_group_id = aws_security_group.app.id
}

