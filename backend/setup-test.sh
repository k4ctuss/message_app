#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd) # dossier contenant le script
COMPOSE_FILE="./docker-compose.test.yml"

docker compose \
  -f "$COMPOSE_FILE" \
  --profile db up -d

attempt=0
until docker exec db-test pg_isready -U test -d test >/dev/null 2>&1; do
  attempt=$((attempt + 1))
  if [ "$attempt" -ge 30 ]; then
    echo "PostgreSQL n'est pas disponible" >&2
    exit 1
  fi
  sleep 1
done

exists=$(docker exec db-test \
  psql -U test -d app_test -tAc \
  "SELECT 1 FROM pg_database WHERE datname = 'app_test'")

if [ "$exists" != "1" ]; then
  docker exec db-test createdb -U test app_test
fi

# check if the database has received migration
# SequelizeMeta, indicate if some migrations have been executed
has_meta_table=$(docker exec db-test \
  psql -U test -d app_test -tAc \
  "SELECT EXISTS (
     SELECT 1
     FROM pg_catalog.pg_tables
     WHERE schemaname = 'public'
       AND tablename = 'SequelizeMeta'
   )")

if [ "$has_meta_table" = "t" ]; then
  has_migrations=$(docker exec db-test \
    psql -U test -d app_test -tAc \
    "SELECT EXISTS (
       SELECT 1
       FROM public.\"SequelizeMeta\"
     )")

  if [ "$has_migrations" = "t" ]; then
    echo "Migrations détectées : reset activé"
    DB_RESET=true
  else
    echo "SequelizeMeta exist but any migration is activated : reset desactivated"
    DB_RESET=false
  fi
else
  echo "SequelizeMeta does not exist : migrations not executed"
  DB_RESET=false
fi

cd "$SCRIPT_DIR"
DB_RESET="$DB_RESET" DB_SEED=true node --env-file=.env.test src/util/updatedb.js