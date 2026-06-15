-- ByteForge D1 Database Schema
-- Database: byteforge
-- Platform: Cloudflare D1 (SQLite)

-- User feedback table
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  route_path TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TEXT NOT NULL,
  user_agent TEXT,
  INDEX idx_document_id (document_id),
  INDEX idx_route_path (route_path),
  INDEX idx_created_at (created_at)
);

-- Content interaction events (views, clicks, etc.)
CREATE TABLE IF NOT EXISTS content_events (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  route_path TEXT NOT NULL,
  event_type TEXT NOT NULL,
  created_at TEXT NOT NULL,
  user_agent TEXT,
  INDEX idx_document_id (document_id),
  INDEX idx_route_path (route_path),
  INDEX idx_event_type (event_type),
  INDEX idx_created_at (created_at)
);
