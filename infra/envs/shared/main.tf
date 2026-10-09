
resource "aws_kms_key" "shared" {
  description             = "KMS key for shared ECR and Terraform state encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "EnableAccountAdministration"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "AllowGithubActionsUse"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.github_actions.arn
        }
        Action = [
          "kms:CreateGrant",
          "kms:Decrypt",
          "kms:DescribeKey",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = "*"
      }
    ]
  })

  tags = {
    Name        = "messaging-app-shared-kms"
    Environment = "shared"
  }
}

resource "aws_kms_alias" "shared" {
  name          = "alias/messaging-app-shared"
  target_key_id = aws_kms_key.shared.key_id
}

resource "aws_ecr_repository" "app" {
  name                 = "messaging-app"
  image_tag_mutability = "IMMUTABLE"

  encryption_configuration {
    encryption_type = "KMS"
    kms_key         = aws_kms_key.shared.arn
  }

  image_scanning_configuration {
    scan_on_push = true
  }
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}

output "github_action_arn" {
  value = aws_iam_role.github_actions.arn
}

resource "aws_s3_bucket" "backend" {
  bucket = "messaging-app-backend" #must match with the backends in staging and prod prociders

  # checkov:skip=CKV_AWS_18:Access logging requires an additional logging bucket and is unnecessary for this project backend.
  # checkov:skip=CKV_AWS_144:Cross-region replication is overkill for this project and would require a second bucket and replication role.
  # checkov:skip=CKV2_AWS_62:No S3 event consumer is configured for the Terraform state bucket.
}

resource "aws_s3_bucket_server_side_encryption_configuration" "backend" {
  bucket = aws_s3_bucket.backend.id

  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.shared.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "backend" {
  bucket = aws_s3_bucket.backend.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "backend" {
  bucket = aws_s3_bucket.backend.id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "backend" {
  bucket = aws_s3_bucket.backend.id

  rule {
    id     = "manage-old-state-versions"
    status = "Enabled"

    noncurrent_version_expiration {
      noncurrent_days = 90
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}