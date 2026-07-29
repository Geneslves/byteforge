# PostgreSQL backups

`postgres-backup.sh` creates a custom-format `pg_dump`, validates it with
`pg_restore --list`, then applies the environment retention policy.

Run manually:

```bash
bash /opt/byteforge/current-production/infra/backup/postgres-backup.sh production
```

Restore into an empty database during a maintenance window:

```bash
docker compose \
  --project-name byteforge-production \
  --env-file /etc/byteforge/production.env \
  --file /opt/byteforge/current-production/infra/docker-compose.prod.yml \
  exec -T db pg_restore \
  --clean --if-exists --no-owner \
  --username byteforge --dbname byteforge \
  /backups/byteforge-production-YYYYMMDDTHHMMSSZ.dump
```

Always test restore procedures against staging before relying on a backup.
