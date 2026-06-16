# Database Migrations

## Overview

This directory contains SQL migration files for the ByteForge D1 database. Migrations are applied in numerical order and track schema changes over time.

## Migration Files

| Version | File | Description | Status |
|---------|------|-------------|--------|
| 001 | `001_initial_schema.sql` | Baseline schema from `schema/d1.sql` | ✅ Applied |
| 002 | `002_add_rate_limits.sql` | Add rate_limits table for API limiting | 🔄 Pending |
| 003 | `003_optimize_indexes.sql` | Add composite indexes for performance | 🔄 Pending |
| 004 | `004_add_refresh_tokens.sql` | Add refresh_tokens table | 🔄 Pending |
| 005 | `005_add_schema_migrations.sql` | Add migration tracking table | 🔄 Pending |

## Applying Migrations

### Development (Local)

```bash
# Apply all migrations
pnpm run db:migrate byteforge-dev

# Apply a specific migration
wrangler d1 execute byteforge-dev --local --file=./migrations/002_add_rate_limits.sql
```

### Staging

```bash
# Apply all migrations to staging
pnpm run db:migrate byteforge-staging

# Apply a specific migration
wrangler d1 execute byteforge-staging --remote --file=./migrations/002_add_rate_limits.sql
```

### Production

```bash
# Apply all migrations to production
pnpm run db:migrate byteforge

# Apply a specific migration
wrangler d1 execute byteforge --remote --file=./migrations/002_add_rate_limits.sql
```

## Migration Naming Convention

```
{version}_{description}.sql
```

**Examples:**
- `001_initial_schema.sql`
- `002_add_rate_limits.sql`
- `003_optimize_indexes.sql`

**Rules:**
- Version is a 3-digit number: `001`, `002`, `003`, etc.
- Description uses snake_case
- Keep descriptions short but descriptive

## Creating a New Migration

1. Create a new file with the next version number
2. Add a comment header with date and purpose
3. Write idempotent SQL (use `IF NOT EXISTS`, `OR IGNORE`, etc.)
4. Update `migration_version` in settings table
5. Add entry to `schema_migrations` table (if exists)
6. Test locally before applying to staging/production

**Template:**

```sql
-- Migration XXX: Description
-- Date: YYYY-MM-DD
-- Purpose: What this migration does
-- Related: Files that use this change

-- Your SQL here
CREATE TABLE IF NOT EXISTS example (...);

-- Update migration version
UPDATE settings SET value = 'XXX', updated_at = datetime('now') 
WHERE key = 'migration_version';

-- Track in migrations table
INSERT OR IGNORE INTO schema_migrations (version, name, applied_at) 
VALUES (XXX, 'description', datetime('now'));
```

## Rollback

D1 doesn't support automatic rollbacks. If a migration fails:

1. **Manual rollback:** Write and apply a reverse migration
2. **Restore from backup:** Use a recent D1 export

**Example rollback:**

```sql
-- Rollback migration 002
DROP TABLE IF EXISTS rate_limits;
DROP INDEX IF EXISTS idx_rate_limits_expires_at;

UPDATE settings SET value = '001', updated_at = datetime('now') 
WHERE key = 'migration_version';

DELETE FROM schema_migrations WHERE version = 2;
```

## Best Practices

1. **Always backup before migrations:**
   ```bash
   wrangler d1 export byteforge --remote --output=backup-$(date +%Y%m%d).sql
   ```

2. **Test locally first:**
   ```bash
   wrangler d1 execute byteforge-dev --local --file=./migrations/XXX.sql
   ```

3. **Use idempotent statements:**
   - `CREATE TABLE IF NOT EXISTS`
   - `CREATE INDEX IF NOT EXISTS`
   - `INSERT OR IGNORE`
   - `UPDATE ... WHERE EXISTS`

4. **Add comments:**
   - What the migration does
   - Why it's needed
   - Which files use the new schema

5. **One logical change per migration:**
   - ✅ Good: `002_add_rate_limits.sql` (one table)
   - ❌ Bad: `002_add_multiple_tables_and_indexes.sql` (too much)

6. **Track migration state:**
   - Update `migration_version` in settings
   - Add entry to `schema_migrations` table

## Migration Script

The `scripts/db/migrate.js` script automates migration application:

```javascript
// Apply all pending migrations in order
node scripts/db/migrate.js byteforge
```

Features:
- Reads all `.sql` files from `migrations/`
- Applies them in numerical order
- Stops on first error
- Logs progress

## Checking Migration Status

```sql
-- Check current migration version
SELECT value FROM settings WHERE key = 'migration_version';

-- List all applied migrations
SELECT * FROM schema_migrations ORDER BY version;
```

## Troubleshooting

### Migration fails with "table already exists"

- Use `IF NOT EXISTS` in CREATE statements
- Or check if migration was partially applied and needs manual cleanup

### Migration order is wrong

- Migrations are applied in alphabetical/numerical order
- Ensure version numbers are zero-padded: `001`, `002`, not `1`, `2`

### Need to skip a migration

- Not recommended, but if necessary:
  ```sql
  INSERT INTO schema_migrations (version, name, applied_at) 
  VALUES (XXX, 'skipped_migration', datetime('now'));
  ```

## Future Migrations

Planned migrations (not yet created):

- `006_add_content_events_archive.sql` - Archive table for old events
- `007_add_admin_audit_log.sql` - Track admin actions
- `008_add_user_preferences.sql` - User settings table

## References

- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [SQLite SQL Reference](https://www.sqlite.org/lang.html)
- [Migration Best Practices](https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate)
