
resource "aws_ecr_repository" "app" {
  name                 = "messaging-app"
  image_tag_mutability = "IMMUTABLE"

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
  bucket = "messaging-app-backend"   # ← doit matcher
}

resource "aws_s3_bucket_versioning" "backend" {
  bucket = aws_s3_bucket.backend.id
  versioning_configuration {
    status = "Enabled"
  }
}