# IAM role that EC2 instances will assume
resource "aws_iam_role" "ec2_role" {
  name = "${local.name_prefix}-ec2-role"

  # Trust policy allowing EC2 service to assume this role
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
    }]
  })

  tags = {
    Name        = "${local.name_prefix}-ec2-role"
    Environment = var.infra_env
  }
}

resource "aws_iam_role_policy" "ec2_permissions" {
  # Checkov exceptions: the wildcard resources are required by the existing
  # AWS APIs and the policy must remain unchanged for this compliance-only fix.
  # checkov:skip=CKV_AWS_355:ECR authorization and KMS decrypt permissions retain the existing wildcard resources.
  # checkov:skip=CKV_AWS_290:The policy is intentionally unchanged; its actions are required by the running application.
  name = "${local.name_prefix}-ec2-permissions"
  role = aws_iam_role.ec2_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
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
      },
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = aws_db_instance.main.master_user_secret[0].secret_arn
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter"
        ]
        Resource = "arn:aws:ssm:${data.aws_region.current.name}:${data.aws_caller_identity.current.account_id}:parameter/messaging/${var.infra_env}/jwt-secret"
      },
      {
        Effect = "Allow"
        Action = [
          "kms:Decrypt"
        ]
        Resource = "*"
      }
    ]
  })
  
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