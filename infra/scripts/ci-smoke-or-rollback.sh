#!/usr/bin/env bash
set -euo pipefail

: "${DEPLOY_ENV:?DEPLOY_ENV is required}"
: "${DEPLOY_URL:?DEPLOY_URL is required}"
: "${DEPLOY_HOST:?DEPLOY_HOST is required}"
: "${DEPLOY_USER:?DEPLOY_USER is required}"

if bash infra/scripts/smoke.sh "$DEPLOY_URL"; then
  exit 0
fi

echo "External smoke failed; rolling back $DEPLOY_ENV" >&2
ssh \
  -i "$HOME/.ssh/byteforge_deploy" \
  -o BatchMode=yes \
  -o StrictHostKeyChecking=yes \
  "$DEPLOY_USER@$DEPLOY_HOST" \
  "bash '/opt/byteforge/current-$DEPLOY_ENV/infra/scripts/rollback.sh' '$DEPLOY_ENV'"

exit 1
