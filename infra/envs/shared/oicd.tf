# create iam role for oicd token for github
resource "aws_iam_openid_connect_provider" "github" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]  # thumbprint du certificat racine, documenté par AWS
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
          "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
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