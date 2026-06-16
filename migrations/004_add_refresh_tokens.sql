-- Migration 004: Add refresh_tokens table
-- Date: 2026-06-15
-- Purpose: Support refresh token functionality for long-lived sessions
-- Related: functions/api/v1/auth/refresh.js

-- Create refresh_tokens table
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,               -- UUID for the refresh token record
  user_id TEXT NOT NULL,             -- Reference to users table
  token_hash TEXT NOT NULL,          -- SHA-256 hash of the refresh token
  expires_at TEXT NOT NULL,          -- ISO 8601 timestamp (30 days from creation)
  created_at TEXT NOT NULL,          -- ISO 8601 timestamp when token was issued
  revoked INTEGER NOT NULL DEFAULT 0 CHECK (revoked IN (0, 1)), -- 0 = active, 1 = revoked
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index on user_id for finding all tokens for a user
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);

-- Index on token_hash for fast token lookup during refresh
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- Index on expires_at for efficient cleanup of expired tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- Index on revoked for filtering active tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_revoked ON refresh_tokens(revoked);

-- Update migration version
UPDATE settings SET value = '004', updated_at = datetime('now')
WHERE key = 'migration_version';
