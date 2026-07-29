#!/usr/bin/env sh
set -eu

environment=${1:?usage: compose.sh <staging|production> <docker compose arguments...>}
shift

case "$environment" in
  staging|production) ;;
  *) echo "Unsupported environment: $environment" >&2; exit 2 ;;
esac

root=${BYTEFORGE_ROOT:-/opt/byteforge}
release=$(readlink -f "$root/current-$environment")
config_root=${BYTEFORGE_CONFIG_ROOT:-/etc/byteforge}
env_file="$config_root/$environment.env"
image_file="$release/image"

test -d "$release/infra"
test -r "$env_file"
test -r "$image_file"

export DEPLOY_ENV="$environment"
export BYTEFORGE_ENV_FILE="$env_file"
export BYTEFORGE_IMAGE
BYTEFORGE_IMAGE=$(cat "$image_file")

exec docker compose \
  --project-name "byteforge-$environment" \
  --env-file "$env_file" \
  --file "$release/infra/docker-compose.prod.yml" \
  "$@"
