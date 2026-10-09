# create iam role for oicd token for github
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"] # thumbprint du certificat racine, documenté par AWS
}

resource "aws_iam_role" "github_actions" {
  name = "github-actions-deploy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Federated = aws_iam_openid_connect_provider.github.arn }
      Action    = "sts:AssumeRoleWithWebIdentity"
      Condition = {
        StringEquals = {
          "token.actions.githubusercontent.com:aud"                 = "sts.amazonaws.com"
          "token.actions.githubusercontent.com:repository_id"       = "1349549585"
          "token.actions.githubusercontent.com:repository_owner_id" = "133981150"
        }
        StringLike = {
          "token.actions.githubusercontent.com:sub" = "repo:k4ctuss@133981150/message_app@1349549585:*"
        }
      }
    }]
  })
}

data "aws_caller_identity" "current" {}


# This role is shared by the staging and production Terraform/deployment
# workflows. Resources created in envs/shared are managed by the bootstrap user.
resource "aws_iam_role_policy" "github_actions_permissions" {
  name = "github-actions-terraform-and-deploy"
  role = aws_iam_role.github_actions.id

  # Terraform must use a few create/delete APIs whose AWS authorization model
  # only supports Resource = "*" before the target resource has an ARN.
  # All resource-addressable statements below remain scoped to this project.
  # checkov:skip=CKV_AWS_290:Terraform create and delete APIs require wildcard resources before staging/prod ARNs exist; scope is limited to this dedicated GitHub OIDC role and repository trust policy.
  # checkov:skip=CKV_AWS_355:EC2 and RDS APIs used for Terraform resource creation do not support resource-level constraints; addressable ECR, S3, KMS, IAM, and Secrets Manager permissions are scoped below.
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "TerraformEc2Read"
        Effect = "Allow"
        Action = [
          "ec2:DescribeAvailabilityZones",
          "ec2:DescribeIamInstanceProfileAssociations",
          "ec2:DescribeImages",
<<<<<<< HEAD
          "ec2:DescribeInstanceTypes",
=======
>>>>>>> main
          "ec2:DescribeInstanceAttribute",
          "ec2:DescribeInstances",
          "ec2:DescribeNetworkInterfaces",
          "ec2:DescribeRegions",
          "ec2:DescribeSecurityGroupRules",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeSubnets",
          "ec2:DescribeTags",
          "ec2:DescribeVolumeStatus",
          "ec2:DescribeVolumes",
          "ec2:DescribeVolumesModifications",
          "ec2:DescribeVpcAttribute",
          "ec2:DescribeVpcs"
        ]
        Resource = "*"
      },
      {
        Sid    = "TerraformEc2Network"
        Effect = "Allow"
        Action = [
          "ec2:AuthorizeSecurityGroupEgress",
          "ec2:AuthorizeSecurityGroupIngress",
          "ec2:CreateSecurityGroup",
          "ec2:CreateTags",
          "ec2:DeleteSecurityGroup",
          "ec2:DeleteTags",
          "ec2:RevokeSecurityGroupEgress",
          "ec2:RevokeSecurityGroupIngress",
          "ec2:UpdateSecurityGroupRuleDescriptionsEgress",
          "ec2:UpdateSecurityGroupRuleDescriptionsIngress"
        ]
        Resource = "*"
      },
      {
        Sid    = "TerraformEc2Instances"
        Effect = "Allow"
        Action = [
          "ec2:CreateVolume",
          "ec2:DeleteVolume",
          "ec2:DescribeVolumes",
          "ec2:ModifyInstanceAttribute",
          "ec2:RebootInstances",
          "ec2:RunInstances",
          "ec2:StartInstances",
          "ec2:StopInstances",
          "ec2:TerminateInstances"
        ]
        Resource = "*"
      },
      {
        Sid    = "TerraformRdsRead"
        Effect = "Allow"
        Action = [
          "rds:DescribeAccountAttributes",
          "rds:DescribeDBInstances",
          "rds:DescribeDBEngineVersions",
          "rds:DescribeDBParameters",
          "rds:DescribeDBParameterGroups",
          "rds:DescribeDBSubnetGroups",
          "rds:DescribeEngineDefaultParameters",
          "rds:DescribeEvents",
          "rds:DescribeOptionGroups",
          "rds:ListTagsForResource"
        ]
        Resource = "*"
      },
      {
        Sid    = "TerraformRdsDatabase"
        Effect = "Allow"
        Action = [
          "rds:AddTagsToResource",
          "rds:CreateDBInstance",
          "rds:CreateDBParameterGroup",
          "rds:CreateDBSubnetGroup",
          "rds:DeleteDBInstance",
          "rds:DeleteDBParameterGroup",
          "rds:DeleteDBSubnetGroup",
          "rds:ModifyDBInstance",
          "rds:ModifyDBParameterGroup",
          "rds:ModifyDBSubnetGroup",
          "rds:RemoveTagsFromResource",
          "rds:RestoreDBInstanceFromDBSnapshot"
        ]
        Resource = [
          "arn:aws:rds:us-east-2:${data.aws_caller_identity.current.account_id}:db:messaging-app-staging-*",
          "arn:aws:rds:us-east-2:${data.aws_caller_identity.current.account_id}:db:messaging-app-prod-*",
          "arn:aws:rds:us-east-2:${data.aws_caller_identity.current.account_id}:pg:messaging-app-staging-*",
          "arn:aws:rds:us-east-2:${data.aws_caller_identity.current.account_id}:pg:messaging-app-prod-*",
          "arn:aws:rds:us-east-2:${data.aws_caller_identity.current.account_id}:subgrp:messaging-app-staging-*",
          "arn:aws:rds:us-east-2:${data.aws_caller_identity.current.account_id}:subgrp:messaging-app-prod-*"
        ]
      },
      {
        Sid    = "TerraformIamApplicationRoles"
        Effect = "Allow"
        Action = [
          "iam:AddRoleToInstanceProfile",
          "iam:AttachRolePolicy",
          "iam:CreateInstanceProfile",
          "iam:CreateRole",
          "iam:DeleteInstanceProfile",
          "iam:DeleteRole",
          "iam:DeleteRolePolicy",
          "iam:DetachRolePolicy",
          "iam:GetInstanceProfile",
          "iam:GetRole",
          "iam:GetRolePolicy",
          "iam:ListAttachedRolePolicies",
          "iam:ListInstanceProfilesForRole",
          "iam:ListRolePolicies",
          "iam:PassRole",
          "iam:PutRolePolicy",
          "iam:RemoveRoleFromInstanceProfile",
          "iam:TagInstanceProfile",
          "iam:TagRole",
          "iam:UntagInstanceProfile",
          "iam:UntagRole",
          "iam:UpdateAssumeRolePolicy"
        ]
        Resource = [
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/messaging-app-staging-*",
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/messaging-app-prod-*",
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:instance-profile/messaging-app-staging-*",
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:instance-profile/messaging-app-prod-*"
        ]
      },
      {
        Sid    = "TerraformIamList"
        Effect = "Allow"
        Action = [
          "iam:ListInstanceProfiles",
          "iam:ListRoles"
        ]
        Resource = "*"
      },
      {
        Sid    = "TerraformIamPassRole"
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = [
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/messaging-app-staging-*",
          "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/messaging-app-prod-*"
        ]
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "ec2.amazonaws.com"
          }
        }
      },
      {
        Sid      = "EcrLogin"
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Sid    = "EcrApplicationRepository"
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:BatchGetImage",
          "ecr:CompleteLayerUpload",
          "ecr:DescribeImages",
          "ecr:DescribeRepositories",
          "ecr:InitiateLayerUpload",
          "ecr:ListImages",
          "ecr:ListTagsForResource",
          "ecr:PutImage",
          "ecr:UploadLayerPart"
        ]
        Resource = "arn:aws:ecr:us-east-2:${data.aws_caller_identity.current.account_id}:repository/messaging-app"
      },
      {
        Sid    = "TerraformStateBucket"
        Effect = "Allow"
        Action = [
          "s3:GetBucketLocation",
          "s3:ListBucket"
        ]
        Resource = "arn:aws:s3:::messaging-app-backend"
      },
      {
        Sid    = "TerraformStateObjects"
        Effect = "Allow"
        Action = [
          "s3:DeleteObject",
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          "arn:aws:s3:::messaging-app-backend/messaging-app-staging-tf/*",
          "arn:aws:s3:::messaging-app-backend/messaging-app-prod-tf/*"
        ]
      },
      {
        Sid    = "TerraformStateEncryption"
        Effect = "Allow"
        Action = [
          "kms:Decrypt",
          "kms:CreateGrant",
          "kms:DescribeKey",
          "kms:Encrypt",
          "kms:GenerateDataKey"
        ]
        Resource = aws_kms_key.shared.arn
      },
      {
        Sid    = "ApplicationSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:DescribeSecret",
          "secretsmanager:GetSecretValue",
          "secretsmanager:ListSecretVersionIds"
        ]
        Resource = [
          "arn:aws:secretsmanager:us-east-2:${data.aws_caller_identity.current.account_id}:secret:messaging-app-staging-*",
          "arn:aws:secretsmanager:us-east-2:${data.aws_caller_identity.current.account_id}:secret:messaging-app-prod-*"
        ]
      },
      {
        Sid    = "SsmSendDeploymentCommand"
        Effect = "Allow"
        Action = "ssm:SendCommand"
        Resource = [
          "arn:aws:ec2:us-east-2:${data.aws_caller_identity.current.account_id}:instance/*",
          "arn:aws:ssm:us-east-2::document/AWS-RunShellScript"
        ]
        Condition = {
          StringEquals = {
            "ssm:resourceTag/Environment" = [
              "staging",
              "prod"
            ]
          }
        }
      },
      {
        Sid    = "SsmCommandStatus"
        Effect = "Allow"
        Action = [
          "ssm:GetCommandInvocation",
          "ssm:ListCommandInvocations"
        ]
        Resource = "*"
      },
      {
        Sid      = "CallerIdentity"
        Effect   = "Allow"
        Action   = "sts:GetCallerIdentity"
        Resource = "*"
      }
    ]
  })
}