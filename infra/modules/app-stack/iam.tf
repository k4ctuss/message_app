# IAM role that EC2 instances will assume
resource "aws_iam_role" "ec2_role" {
  name = "${local.name_prefix}-ec2-role"

  # Trust policy allowing EC2 service to assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      },
	  {
        Effect = "Allow"
        Action = [
          "ecr:GetAuthorizationToken"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer"
        ]
        Resource = data.aws_ecr_repository.app.arn
      }
    ]
  })

  tags = {
    Name        = "${local.name_prefix}-ec2-role"
    Environment = var.infra_env
  }
}

# Attach AWS-managed policy for Systems Manager access
# This allows SSM Session Manager connections without SSH
resource "aws_iam_role_policy_attachment" "ec2_ssm" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# Instance profile wraps the role so it can be attached to EC2 instances
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${local.name_prefix}-ec2-profile"
  role = aws_iam_role.ec2_role.name
}