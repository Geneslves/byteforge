#!/usr/bin/env sh
set -eu

environment=${1:?usage: postgres-backup.sh <staging|production> [release-dir]}
root=${BYTEFORGE_ROOT:-/opt/byteforge}
config_root=${BYTEFORGE_CONFIG_ROOT:-/etc/byteforge}
release=${2:-$(readlink -f "$root/current-$environment")}
env_file="$config_root/$environment.env"

case "$environment" in
  staging|production) ;;
  *) echo "Unsupported environment: $environment" >&2; exit 2 ;;
esac

test -r "$env_file"
test -r "$release/image"

if [ "${BYTEFORGE_LOCK_HELD:-0}" != "1" ]; then
  exec 9>"$root/operation-$environment.lock"
  flock -n 9 || {
    echo "Another $environment operation is already running" >&2
    exit 1
  }
fi

read_env_value() {
  key=$1
  awk -F= -v key="$key" '$1 == key { print substr($0, index($0, "=") + 1); exit }' "$env_file"
}

backup_root=$(read_env_value BYTEFORGE_BACKUP_ROOT)
retention_days=$(read_env_value BACKUP_RETENTION_DAYS)
retention_days=${retention_days:-14}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
filename="byteforge-$environment-$timestamp.dump"

mkdir -p "$backup_root"

export DEPLOY_ENV="$environment"
export BYTEFORGE_ENV_FILE="$env_file"
export BYTEFORGE_IMAGE
BYTEFORGE_IMAGE=$(cat "$release/image")

compose() {
  docker compose \
    --project-name "byteforge-$environment" \
    --env-file "$env_file" \
    --file "$release/infra/docker-compose.prod.yml" \
    "$@"
}

compose exec -T -u 0 db sh -ceu '
  pg_dump --username="$POSTGRES_USER" --dbname="$POSTGRES_DB" --format=custom --file="/backups/$1.tmp"
  pg_restore --list "/backups/$1.tmp" >/dev/null
  mv "/backups/$1.tmp" "/backups/$1"
' sh "$filename"

test -s "$backup_root/$filename"
find "$backup_root" -type f -name "byteforge-$environment-*.dump" -mtime "+$retention_days" -delete

echo "Verified PostgreSQL backup: $backup_root/$filename"
