#!/bin/bash
set -euo pipefail

ENV_FILE="${ENV_FILE:-/etc/app/runtime.env}"
CONTAINER_NAME="app_staging"
CONTAINER_PORT="3000"
HEALTH_CHECK_PATH="/health"
HEALTH_CHECK_TIMEOUT=120
HEALTH_CHECK_INTERVAL=2
TOKEN_SECRET_PARAMETER="/messaging/staging/jwt-secret"

: "${IMAGE_TAG:?IMAGE_TAG doit être fourni}"
: "${ECR_REGISTRY:?ECR_REGISTRY doit être fourni}"
: "${DB_SECRET_ARN:?DB_SECRET_ARN doit être fourni}"
: "${DB_ENDPOINT:?DB_ENDPOINT doit être fourni}"
: "${DB_NAME:?DB_NAME doit être fourni}"

command -v aws >/dev/null || { echo "ERROR: aws CLI is required."; exit 1; }
command -v jq >/dev/null || { echo "ERROR: jq is required."; exit 1; }

DB_SECRET_JSON=$(aws secretsmanager get-secret-value \
    --secret-id "$DB_SECRET_ARN" \
    --query SecretString \
    --output text)

DB_USER=$(jq -r '.username | @uri' <<< "$DB_SECRET_JSON")
DB_PASSWORD=$(jq -r '.password | @uri' <<< "$DB_SECRET_JSON")
DATABASE_URL="postgresql://${DB_USER}:${DB_PASSWORD}@${DB_ENDPOINT}/${DB_NAME}"

TOKEN_SECRET=$(aws ssm get-parameter \
    --name "$TOKEN_SECRET_PARAMETER" \
    --with-decryption \
    --query Parameter.Value \
    --output text)

umask 077
TEMP_ENV_FILE=$(mktemp "${ENV_FILE}.XXXXXX")
trap 'rm -f "$TEMP_ENV_FILE"' EXIT
printf 'NODE_ENV=production\nPORT=3000\nDATABASE_URL=%s\nTOKENSECRET=%s\n' \
    "$DATABASE_URL" "$TOKEN_SECRET" > "$TEMP_ENV_FILE"
chmod 600 "$TEMP_ENV_FILE"
mv "$TEMP_ENV_FILE" "$ENV_FILE"
trap - EXIT

NEW_IMAGE="${ECR_REGISTRY}/messaging-app:${IMAGE_TAG}"

aws ecr get-login-password --region "${AWS_REGION:-eu-west-3}" \
  | docker login --username AWS --password-stdin "$ECR_REGISTRY"

docker pull "$NEW_IMAGE"

if ! docker run --rm \
    --env-file "$ENV_FILE" \
    "$NEW_IMAGE" \
    npm run migrate
then
    exit 1
fi

docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    --env-file "$ENV_FILE" \
    -p "127.0.0.1:${CONTAINER_PORT}:3000" \
    "$NEW_IMAGE"

elapsed=0
while true; do
    if curl -sf \
        "http://127.0.0.1:${CONTAINER_PORT}${HEALTH_CHECK_PATH}" \
        > /dev/null
    then
        echo "Health check successful."
        break
    fi

    if (( elapsed >= HEALTH_CHECK_TIMEOUT )); then
        docker rm -f "$CONTAINER_NAME" || true
        exit 1
    fi

    sleep "$HEALTH_CHECK_INTERVAL"
    elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
done
