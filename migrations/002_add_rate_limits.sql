-- Migration 002: Add rate_limits table
-- Date: 2026-06-15
-- Purpose: Support API rate limiting functionality
-- Related: functions/lib/rate-limit/index.js

-- Create rate_limits table for storing rate limit counters
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,              -- Rate limit key (e.g., "rl:ip:127.0.0.1:1718467200000")
  value TEXT NOT NULL,               -- Current count as string
  expires_at TEXT NOT NULL,          -- ISO 8601 timestamp when this entry expires
  created_at TEXT NOT NULL           -- ISO 8601 timestamp when this entry was created
);

-- Index on expires_at for efficient cleanup of expired entries
CREATE INDEX IF NOT EXISTS idx_rate_limits_expires_at ON rate_limits(expires_at);

-- Add migration record
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
  ('migration_version', '002', datetime('now'));
