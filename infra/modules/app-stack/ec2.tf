

resource "aws_instance" "app" {
  # Checkov exceptions: these settings are part of the existing deployment
  # contract and are intentionally not changed for a compliance-only check.
  # checkov:skip=CKV_AWS_88:The instance intentionally uses a public IP because it is the existing direct ingress path.
  # checkov:skip=CKV_AWS_135:EBS optimization is intentionally unchanged because the selected instance type already defines the deployment behavior.
  # checkov:skip=CKV_AWS_126:Detailed monitoring would add cost and is not enabled in the existing deployment.
  ami                         = var.instance_ami
  instance_type               = var.instance_type
  vpc_security_group_ids      = [aws_security_group.app.id]
  associate_public_ip_address = true

  # Attach IAM role for SSM access
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

  root_block_device {
    volume_size = var.root_volume_size
    volume_type = "gp3"
    encrypted   = true
  }

  user_data = templatefile("${path.module}/scripts/setup_ec2.sh.tftpl", {
    infra_env      = var.infra_env
    nginx_conf     = file("${path.module}/../../../nginx/nginx.conf")
    nginx_app_conf = file("${path.module}/../../../nginx/${var.infra_env}-app.conf")
  })

  # Enforce IMDSv2 for enhanced security
  # This prevents SSRF attacks against the instance metadata service
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }

  lifecycle {
    ignore_changes = [ami] # no ec2 instance change on each ubuntu publication
  }

  tags = {
    Name        = "${local.name_prefix}-ec2-app"
    Environment = var.infra_env
  }
}

resource "aws_eip" "app_eip" {
  domain   = "vpc"
  instance = aws_instance.app.id

  tags = {
    Name        = "${local.name_prefix}-ec2-eip"
    Environment = var.infra_env
  }
}
