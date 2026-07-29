#!/usr/bin/env sh
set -eu

environment=${1:?usage: deploy.sh <staging|production> <release-id> <image> <bundle-root>}
release_id=${2:?release id is required}
image=${3:?immutable image reference is required}
bundle_root=${4:?bundle root is required}

case "$environment" in
  staging|production) ;;
  *) echo "Unsupported environment: $environment" >&2; exit 2 ;;
esac

case "$release_id" in
  *[!A-Za-z0-9._-]*|'') echo "Unsafe release id: $release_id" >&2; exit 2 ;;
esac

case "$image" in
  ghcr.io/*@sha256:*) ;;
  *) echo "An immutable GHCR digest is required: $image" >&2; exit 2 ;;
esac

root=${BYTEFORGE_ROOT:-/opt/byteforge}
config_root=${BYTEFORGE_CONFIG_ROOT:-/etc/byteforge}
lock_file="$root/operation-$environment.lock"
release_dir="$root/releases/$environment/$release_id"
current_link="$root/current-$environment"
previous_link="$root/previous-$environment"
env_file="$config_root/$environment.env"

test -r "$env_file"
test -f "$bundle_root/infra/docker-compose.prod.yml"

exec 9>"$lock_file"
flock -n 9 || {
  echo "Another $environment operation is already running" >&2
  exit 1
}

mkdir -p "$release_dir"
cp -R "$bundle_root/infra" "$release_dir/"
printf '%s\n' "$image" > "$release_dir/image"

previous_release=''
if [ -L "$current_link" ]; then
  previous_release=$(readlink -f "$current_link")
fi

read_env_value() {
  key=$1
  awk -F= -v key="$key" '$1 == key { print substr($0, index($0, "=") + 1); exit }' "$env_file"
}

compose_release() {
  target_release=$1
  shift
  export DEPLOY_ENV="$environment"
  export BYTEFORGE_ENV_FILE="$env_file"
  export BYTEFORGE_IMAGE
  BYTEFORGE_IMAGE=$(cat "$target_release/image")
  docker compose \
    --project-name "byteforge-$environment" \
    --env-file "$env_file" \
    --file "$target_release/infra/docker-compose.prod.yml" \
    "$@"
}

rollback_on_error() {
  status=$?
  if [ "$status" -ne 0 ] && [ -n "$previous_release" ]; then
    echo "Deployment failed; restoring $previous_release" >&2
    compose_release "$previous_release" up -d --remove-orphans || true
  fi
  exit "$status"
}
trap rollback_on_error EXIT HUP INT TERM

if [ -n "$previous_release" ]; then
  BYTEFORGE_LOCK_HELD=1 \
    sh "$previous_release/infra/backup/postgres-backup.sh" "$environment" "$previous_release"
fi

compose_release "$release_dir" pull
compose_release "$release_dir" up -d db
compose_release "$release_dir" run --rm app node scripts/migrate-postgres.js
compose_release "$release_dir" up -d --remove-orphans

http_port=$(read_env_value BYTEFORGE_HTTP_PORT)
SMOKE_ATTEMPTS=30 SMOKE_DELAY_SECONDS=2 \
  sh "$release_dir/infra/scripts/smoke.sh" "http://127.0.0.1:$http_port"

if [ -n "$previous_release" ]; then
  ln -sfn "$previous_release" "$previous_link"
fi
ln -sfn "$release_dir" "$current_link"

trap - EXIT HUP INT TERM
echo "Deployment complete: $environment -> $image"
