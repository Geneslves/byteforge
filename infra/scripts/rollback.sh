#!/usr/bin/env sh
set -eu

environment=${1:?usage: rollback.sh <staging|production>}

case "$environment" in
  staging|production) ;;
  *) echo "Unsupported environment: $environment" >&2; exit 2 ;;
esac

root=${BYTEFORGE_ROOT:-/opt/byteforge}
config_root=${BYTEFORGE_CONFIG_ROOT:-/etc/byteforge}
lock_file="$root/operation-$environment.lock"
current_link="$root/current-$environment"
previous_link="$root/previous-$environment"
env_file="$config_root/$environment.env"

current_release=$(readlink -f "$current_link")
previous_release=$(readlink -f "$previous_link")

test -d "$current_release/infra"
test -d "$previous_release/infra"
test -r "$env_file"

exec 9>"$lock_file"
flock -n 9 || {
  echo "Another $environment operation is already running" >&2
  exit 1
}

export DEPLOY_ENV="$environment"
export BYTEFORGE_ENV_FILE="$env_file"
export BYTEFORGE_IMAGE
BYTEFORGE_IMAGE=$(cat "$previous_release/image")

docker compose \
  --project-name "byteforge-$environment" \
  --env-file "$env_file" \
  --file "$previous_release/infra/docker-compose.prod.yml" \
  up -d --remove-orphans

http_port=$(awk -F= '$1 == "BYTEFORGE_HTTP_PORT" { print substr($0, index($0, "=") + 1); exit }' "$env_file")
SMOKE_ATTEMPTS=30 SMOKE_DELAY_SECONDS=2 \
  sh "$previous_release/infra/scripts/smoke.sh" "http://127.0.0.1:$http_port"

ln -sfn "$current_release" "$previous_link"
ln -sfn "$previous_release" "$current_link"

echo "Rollback complete: $environment -> $BYTEFORGE_IMAGE"
