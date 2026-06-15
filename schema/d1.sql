-- ByteForge D1 Database Schema
-- Database: byteforge
-- Platform: Cloudflare D1 (SQLite)

-- User accounts table
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  last_login TEXT,
  INDEX idx_username (username),
  INDEX idx_email (email),
  INDEX idx_role (role)
);

-- System settings table
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

-- Sessions table (for JWT token blacklist or session management)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_token (token),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- User feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  document_id TEXT,
  route_path TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  user_agent TEXT,
  INDEX idx_user_id (user_id),
  INDEX idx_document_id (document_id),
  INDEX idx_route_path (route_path),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Content interaction events (views, clicks, etc.)
CREATE TABLE IF NOT EXISTS content_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  document_id TEXT,
  route_path TEXT NOT NULL,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  user_agent TEXT,
  INDEX idx_user_id (user_id),
  INDEX idx_document_id (document_id),
  INDEX idx_route_path (route_path),
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Insert default settings
INSERT OR IGNORE INTO settings (key, value, updated_at) VALUES
  ('registration_enabled', 'true', datetime('now')),
  ('site_name', 'ByteForge', datetime('now')),
  ('require_email_verification', 'false', datetime('now'));

