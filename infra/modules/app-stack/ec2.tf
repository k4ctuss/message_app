

resource "aws_instance" "app" {
	ami           = var.instance_ami
	instance_type = var.instance_type
	vpc_security_group_ids = [aws_security_group.app.id]
	associate_public_ip_address = true

	# Attach IAM role for SSM access
	iam_instance_profile = aws_iam_instance_profile.ec2_profile.name

	root_block_device {
	  volume_size = var.root_volume_size
	  volume_type = "gp3"
	  encrypted = true
	}

	user_data = templatefile("${path.module}/user_data.sh.tftpl", {
		nginx_conf = file("${path.module}/../../../nginx/nginx.conf")
		nginx_app_conf = file("${path.module}/../../../nginx/app.conf")
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

