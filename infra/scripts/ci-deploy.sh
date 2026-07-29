#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_ENV:?DEPLOY_ENV is required}"
: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_USER:?DEPLOY_USER is required}"
: "${SSH_PRIVATE_KEY:?SSH_PRIVATE_KEY is required}"
: "${SSH_KNOWN_HOSTS:?SSH_KNOWN_HOSTS is required}"
: "${GHCR_USERNAME:?GHCR_USERNAME is required}"
: "${GHCR_PULL_TOKEN:?GHCR_PULL_TOKEN is required}"
: "${BYTEFORGE_IMAGE:?BYTEFORGE_IMAGE is required}"
: "${RELEASE_ID:?RELEASE_ID is required}"

ssh_dir="$HOME/.ssh"
key_file="$ssh_dir/byteforge_deploy"
remote_bundle="/tmp/byteforge-release-$RELEASE_ID-$DEPLOY_ENV"

install -d -m 0700 "$ssh_dir"
printf '%s\n' "$SSH_PRIVATE_KEY" > "$key_file"
chmod 0600 "$key_file"
printf '%s\n' "$SSH_KNOWN_HOSTS" > "$ssh_dir/known_hosts"
chmod 0600 "$ssh_dir/known_hosts"

ssh_args=(-i "$key_file" -o BatchMode=yes -o StrictHostKeyChecking=yes)
remote="$DEPLOY_USER@$DEPLOY_HOST"

ssh "${ssh_args[@]}" "$remote" "mkdir -p '$remote_bundle'"
scp "${ssh_args[@]}" -r infra "$remote:$remote_bundle/"
printf '%s' "$GHCR_PULL_TOKEN" \
  | ssh "${ssh_args[@]}" "$remote" "docker login ghcr.io --username '$GHCR_USERNAME' --password-stdin"

ssh "${ssh_args[@]}" "$remote" \
  "bash '$remote_bundle/infra/scripts/deploy.sh' '$DEPLOY_ENV' '$RELEASE_ID' '$BYTEFORGE_IMAGE' '$remote_bundle'"
ssh "${ssh_args[@]}" "$remote" "rm -rf -- '$remote_bundle'"
