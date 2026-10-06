#!/bin/bash
set -euo pipefail

ACTIVE_SLOT_FILE="/etc/app/active_slot"
NGINX_BACKEND_FILE="/etc/nginx/conf.d/active_backend.conf"

HEALTH_CHECK_PATH="/health"
HEALTH_CHECK_TIMEOUT=120
HEALTH_CHECK_INTERVAL=2
ENV_FILE="${ENV_FILE:-/etc/app/runtime.env}"

TOKEN_SECRET_PARAMETER="/messaging/prod/jwt-secret"

: "${DB_SECRET_ARN:?DB_SECRET_ARN doit être fourni}"
: "${DB_ENDPOINT:?DB_ENDPOINT doit être fourni}"
: "${DB_NAME:?DB_NAME doit être fourni}"

command -v aws >/dev/null || { echo "ERROR: aws CLI is required."; exit 1; }
command -v jq >/dev/null || { echo "ERROR: jq is required."; exit 1; }

if [[ ! -f "$ACTIVE_SLOT_FILE" ]]; then
    echo "ERROR: $ACTIVE_SLOT_FILE does not exist." # should be create in user data script in ec2.tf 
    exit 1
fi

: "${IMAGE_TAG:?IMAGE_TAG doit être fourni}"
: "${ECR_REGISTRY:?ECR_REGISTRY doit être fourni}"

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

ACTIVE_SLOT=$(cat "$ACTIVE_SLOT_FILE")

# Déterminer actual slot and next slot
case "$ACTIVE_SLOT" in

    none)
        CURRENT_SLOT=""
        NEW_SLOT="blue"
        NEW_PORT="3001"
        ;;

    blue)
        CURRENT_SLOT="blue"
        NEW_SLOT="green"
        NEW_PORT="3002"
        ;;

    green)
        CURRENT_SLOT="green"
        NEW_SLOT="blue"
        NEW_PORT="3001"
        ;;

    *)
        echo "ERROR: Invalid active slot: $ACTIVE_SLOT"
        exit 1
        ;;

esac

# Migration db if new migration are available, exit if migration failed

if ! docker run --rm \
    --env-file "$ENV_FILE" \
    "$NEW_IMAGE" \
    npm run migrate
then
    exit 1
fi


# run next conteneur
CONTAINER_NAME="app_$NEW_SLOT"

# delete containeur name if exist
docker rm -f "$CONTAINER_NAME" 2>/dev/null || true

docker run -d \
    --name "$CONTAINER_NAME" \
    --env-file "$ENV_FILE" \
    -p "$NEW_PORT:3000" \
    "$NEW_IMAGE"

# Health check
elapsed=0
while true; do

    if curl -sf \
        "http://127.0.0.1:${NEW_PORT}${HEALTH_CHECK_PATH}" \
        > /dev/null
    then
        echo "Health check successful."
        break
    fi

    if (( elapsed >= HEALTH_CHECK_TIMEOUT )); then
		# container not healthy, delete and exit
        docker rm -f "$CONTAINER_NAME" || true
        exit 1
    fi
    sleep "$HEALTH_CHECK_INTERVAL"
    elapsed=$((elapsed + HEALTH_CHECK_INTERVAL))
done

# Switching Nginx
cat > "$NGINX_BACKEND_FILE" <<EOF
server 127.0.0.1:$NEW_PORT;
EOF

if ! nginx -t; then
    # ERROR: Nginx configuration test failed.
    # Restoring previous backend

    if [[ "$CURRENT_SLOT" == "blue" ]]; then
        CURRENT_PORT="3001"
    elif [[ "$CURRENT_SLOT" == "green" ]]; then
        CURRENT_PORT="3002"
    else
        CURRENT_PORT=""
    fi

    if [[ -n "$CURRENT_PORT" ]]; then
        cat > "$NGINX_BACKEND_FILE" <<EOF
server 127.0.0.1:$CURRENT_PORT;
EOF
    fi
    docker rm -f "$CONTAINER_NAME" || true
    exit 1
fi

# Reload Nginx.
if ! systemctl reload nginx; then
    exit 1
fi

#update slot
echo "$NEW_SLOT" > "$ACTIVE_SLOT_FILE"

# delete previous containeur
if [[ -n "$CURRENT_SLOT" ]]; then

    OLD_CONTAINER="app_$CURRENT_SLOT"
	docker rm -f "$OLD_CONTAINER" || true
fi