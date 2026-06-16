-- Migration 005: Add schema_migrations tracking table
-- Date: 2026-06-15
-- Purpose: Track applied migrations for better version control

-- Create schema_migrations table for tracking migration history
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,       -- Migration version number (e.g., 1, 2, 3)
  name TEXT NOT NULL,                -- Migration name (e.g., "add_rate_limits")
  applied_at TEXT NOT NULL           -- ISO 8601 timestamp when migration was applied
);

-- Seed with existing migrations
INSERT OR IGNORE INTO schema_migrations (version, name, applied_at) VALUES
  (1, 'initial_schema', datetime('now')),
  (2, 'add_rate_limits', datetime('now')),
  (3, 'optimize_indexes', datetime('now')),
  (4, 'add_refresh_tokens', datetime('now')),
  (5, 'add_schema_migrations', datetime('now'));

-- Update migration version
UPDATE settings SET value = '005', updated_at = datetime('now')
WHERE key = 'migration_version';
