#!/bin/bash

ACTIVE_SLOT_FILE="/etc/app/active_slot"
NGINX_BACKEND_FILE="/etc/nginx/conf.d/active_backend.conf"

HEALTH_CHECK_PATH="/health"
HEALTH_CHECK_TIMEOUT=120
HEALTH_CHECK_INTERVAL=2

if [[ ! -f "$ACTIVE_SLOT_FILE" ]]; then
    echo "ERROR: $ACTIVE_SLOT_FILE does not exist." # should be create in user data script in ec2.tf 
    exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
    echo "ERROR: $ENV_FILE does not exist."
    exit 1
fi

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
    "$IMAGE" \
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
    "$IMAGE" \
    npm run start:prod


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