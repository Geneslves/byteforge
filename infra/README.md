# ByteForge production infrastructure

This directory is the source of truth for the DigitalOcean deployment. It
assumes one Ubuntu Droplet running Caddy on the host and two isolated Compose
projects:

| Environment | Public host | Loopback port | Compose project |
| --- | --- | --- | --- |
| staging | `staging.thebyte.tech` | `127.0.0.1:3001` | `byteforge-staging` |
| production | `www.thebyte.tech` | `127.0.0.1:3000` | `byteforge-production` |

The apex domain is permanently redirected to the production `www` host.
Staging emits `X-Robots-Tag: noindex`.

## Fixed runtime

- Node.js: `22.23.1` (`.nvmrc`, `.node-version`, Docker build argument)
- pnpm: `10.33.0`, activated through Corepack
- PostgreSQL: `15.18-alpine` (keeps the existing major version)
- Dependency installation: `pnpm install --frozen-lockfile`
- Application images: immutable GHCR digest references

Do not install global pnpm on the server. The host only needs Docker Engine,
the Docker Compose plugin, Caddy, curl, and systemd.

## Server layout

```text
/opt/byteforge/
  releases/{staging,production}/<git-sha>/
  current-staging -> releases/staging/<git-sha>
  previous-staging -> releases/staging/<previous-sha>
  current-production -> releases/production/<git-sha>
  previous-production -> releases/production/<previous-sha>
/etc/byteforge/
  staging.env
  production.env
/var/backups/byteforge/{staging,production}/
/var/log/caddy/byteforge-*-access.log
/var/lib/docker/volumes/byteforge-*-postgres-data/
```

Application and PostgreSQL container logs use Docker's `local` driver with
rotation. Read them with:

```bash
docker compose --project-name byteforge-production logs --tail=200 app db
journalctl -u byteforge@production
journalctl -u byteforge-backup@production
```

Deploy, rollback, and scheduled backup operations share an environment-scoped
`flock` file under `/opt/byteforge`, preventing overlapping migrations and
backups.

## One-time bootstrap

Install Docker Engine, the Compose plugin, Caddy, and curl from their official
repositories. Create DNS records for `www`, apex, and `staging`, then run from
a checked-out repository:

```bash
sudo sh infra/scripts/bootstrap.sh byteforge-deploy "$PWD"
node scripts/create-deploy-env.js staging
node scripts/create-deploy-env.js production
sudo install -m 0640 -o root -g byteforge-deploy \
  infra/env/staging.env /etc/byteforge/staging.env
sudo install -m 0640 -o root -g byteforge-deploy \
  infra/env/production.env /etc/byteforge/production.env
sudoedit /etc/byteforge/staging.env
sudoedit /etc/byteforge/production.env
```

The generator fills PostgreSQL and JWT secrets with different random values for
each environment. Review `SITE_URL`, `SITE_ORIGIN`, and `ALLOWED_ORIGINS`
before installing the files, then validate them:

```bash
node scripts/check-deploy-config.js infra/env/staging.env
node scripts/check-deploy-config.js infra/env/production.env
```

Log out and back in so the deploy user receives Docker group membership.

After the first successful deployment:

```bash
sudo systemctl enable byteforge@staging byteforge@production
sudo systemctl enable --now \
  byteforge-backup@staging.timer \
  byteforge-backup@production.timer
```

Application releases carry their own Compose and helper scripts. Host-level
changes to `infra/Caddyfile` or `infra/systemd/` are intentionally not applied
before production approval; re-run `bootstrap.sh` from the approved revision,
then validate and reload the affected services.

## Environment variables

The tracked examples under `infra/env/` are the complete non-GHCR runtime
contract:

- deployment: `DEPLOY_ENV`, `BYTEFORGE_HTTP_PORT`,
  `BYTEFORGE_BACKUP_ROOT`
- origin/CORS: `SITE_URL`, `SITE_ORIGIN`, `ALLOWED_ORIGINS`
- feature gates: `REGISTRATION_ENABLED`
- PostgreSQL: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`
- authentication: `JWT_SECRET`
- retention: `BACKUP_RETENTION_DAYS`

`BYTEFORGE_IMAGE` is release state, written to each release's `image` file.
Never store secrets in GitHub repository variables or tracked files.

## Migrations

The deployment script starts PostgreSQL, takes a verified backup of an existing
database, then runs the new image's idempotent migration:

```bash
docker compose run --rm app node scripts/migrate-postgres.js
```

Schema changes must remain backward-compatible with the immediately previous
application image; image rollback does not automatically reverse database
migrations.

## Deployment and rollback

CI publishes `ghcr.io/geneslves/byteforge@sha256:<digest>`. Deployment copies
this `infra/` directory into an immutable release, backs up PostgreSQL, runs
migrations, starts the stack, and checks readiness plus hard-404 behavior.

If local readiness fails, `deploy.sh` automatically restores the previous
image. If the public staging/production smoke test fails, GitHub Actions calls:

```bash
bash /opt/byteforge/current-production/infra/scripts/rollback.sh production
```

Manual rollback uses the same command. Inspect `current-*` and `previous-*`
symlinks before deleting old releases. The very first deployment has no
previous image, so retain the manually deployed image until the second
repository-managed release succeeds.

## GitHub environments and secrets

Create `staging` and `production` Environments. Configure required reviewers on
`production`, prevent self-review where available, and restrict it to `main`.
Store these secrets separately in each Environment:

- `DEPLOY_HOST`
- `DEPLOY_USER` (`byteforge-deploy`)
- `SSH_PRIVATE_KEY`
- `SSH_KNOWN_HOSTS` (pre-verified host key; do not generate it during CI)
- `GHCR_USERNAME`
- `GHCR_PULL_TOKEN` (fine-grained token with package read access only)

CI deploys the exact tested image digest to staging, runs a public smoke test,
then enters the protected production Environment. Production never rebuilds
the image.

## Firewall

Attach a DigitalOcean Cloud Firewall to the Droplet:

| Direction | Protocol/port | Source |
| --- | --- | --- |
| inbound | TCP 80 | all IPv4/IPv6 |
| inbound | TCP 443 | all IPv4/IPv6 |
| inbound | TCP 22 | trusted administrator CIDRs only |
| outbound | TCP 53, 80, 443 | all |
| outbound | UDP 53, 123 | all |

Do not expose ports 3000, 3001, or 5432. They are loopback-only or internal
Compose networking. DigitalOcean Cloud Firewall and host UFW are independent;
if both are enabled, keep their allowlists consistent.

Example host UFW baseline (replace the SSH CIDR before enabling):

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow from TRUSTED_ADMIN_CIDR to any port 22 proto tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Cloudflare SSL/TLS mode must be **Full (strict)**.
