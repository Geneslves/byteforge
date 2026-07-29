#!/usr/bin/env sh
set -eu

base_url=${1:?usage: smoke.sh <base-url>}
base_url=${base_url%/}
attempts=${SMOKE_ATTEMPTS:-30}
delay=${SMOKE_DELAY_SECONDS:-5}

attempt=1
while [ "$attempt" -le "$attempts" ]; do
  if body=$(curl --fail --silent --show-error --max-time 10 "$base_url/api/health/ready" 2>/dev/null) \
    && printf '%s' "$body" | grep -q '"status":"ready"'; then
    break
  fi
  if [ "$attempt" -eq "$attempts" ]; then
    echo "Readiness failed after $attempts attempts: $base_url" >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep "$delay"
done

root_status=$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 10 "$base_url/")
missing_status=$(curl --silent --output /dev/null --write-out '%{http_code}' --max-time 10 "$base_url/__release_smoke_missing__")

test "$root_status" = "200"
test "$missing_status" = "404"

echo "Smoke test passed: $base_url (ready=200 root=200 missing=404)"
