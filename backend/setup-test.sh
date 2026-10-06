#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) # dossier contenant le script
PROJECT_DIR=$(CDPATH= cd -- "$SCRIPT_DIR/.." && pwd)    # dossier du prjet
COMPOSE_FILE="$PROJECT_DIR/docker-compose.yml"

docker compose \
  -f "$COMPOSE_FILE" \
  --profile db up -d

attempt=0
until docker exec messaging-db pg_isready -U postgres -d postgres >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "PostgreSQL n'est pas disponible" >&2
    exit 1
  fi
  sleep 1
done

exists=$(docker exec messaging-db \
  psql -U postgres -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname = 'messaging_test'")

if [ "$exists" != "1" ]; then
  docker exec messaging-db createdb -U postgres messaging_test
fi

# check if the database has received migration
# SequelizeMeta, indicate if some migrations have been executed
has_migrations=$(docker exec messaging-db \
  psql -U postgres -d messaging_test -tAc \
  "SELECT CASE
      WHEN to_regclass('public.\"SequelizeMeta\"') IS NOT NULL
       AND EXISTS (SELECT 1 FROM \"SequelizeMeta\")
      THEN 1
      ELSE 0
    END")

if [ "$has_migrations" = "1" ]; then
  echo "Migrations détectées : reset activé"
  DB_RESET=true
else
  echo "Aucune migration détectée : reset désactivé"
  DB_RESET=false
fi

cd "$SCRIPT_DIR"
NODE_ENV=test DB_RESET="$DB_RESET" DB_SEED=true npm run updatedb