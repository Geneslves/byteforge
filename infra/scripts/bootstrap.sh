#!/usr/bin/env sh
set -eu

deploy_user=${1:-byteforge-deploy}
source_root=${2:-$(pwd)}

if [ "$(id -u)" -ne 0 ]; then
  echo "bootstrap.sh must run as root" >&2
  exit 1
fi

for command in docker caddy curl systemctl flock; do
  command -v "$command" >/dev/null 2>&1 || {
    echo "Missing required command: $command" >&2
    exit 1
  }
done

id "$deploy_user" >/dev/null 2>&1 || useradd --create-home --shell /bin/bash "$deploy_user"
usermod -aG docker "$deploy_user"

install -d -m 0755 -o "$deploy_user" -g "$deploy_user" /opt/byteforge
install -d -m 0755 -o "$deploy_user" -g "$deploy_user" /opt/byteforge/releases/staging
install -d -m 0755 -o "$deploy_user" -g "$deploy_user" /opt/byteforge/releases/production
install -d -m 0750 -o "$deploy_user" -g "$deploy_user" /var/backups/byteforge/staging
install -d -m 0750 -o "$deploy_user" -g "$deploy_user" /var/backups/byteforge/production
install -d -m 0750 -o root -g "$deploy_user" /etc/byteforge

install -m 0644 "$source_root/infra/Caddyfile" /etc/caddy/Caddyfile
install -m 0644 "$source_root/infra/systemd/byteforge@.service" /etc/systemd/system/byteforge@.service
install -m 0644 "$source_root/infra/systemd/byteforge-backup@.service" /etc/systemd/system/byteforge-backup@.service
install -m 0644 "$source_root/infra/systemd/byteforge-backup@.timer" /etc/systemd/system/byteforge-backup@.timer

systemctl daemon-reload
caddy validate --config /etc/caddy/Caddyfile
systemctl reload caddy

echo "Bootstrap complete."
echo "Next: install /etc/byteforge/{staging,production}.env with mode 0640."
echo "Log out and back in before using Docker as $deploy_user."
