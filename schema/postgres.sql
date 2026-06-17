-- PostgreSQL Schema for ByteForge
-- Converted from Cloudflare D1 (SQLite) to PostgreSQL

-- ============================================
-- 1. Users Table
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Indexes for users
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- ============================================
-- 2. Refresh Tokens Table
-- ============================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked BOOLEAN NOT NULL DEFAULT FALSE
);

-- Indexes for refresh_tokens
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);

-- ============================================
-- 3. Feedback Table
-- ============================================
CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  route_path TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT
);

-- Indexes for feedback
CREATE INDEX IF NOT EXISTS idx_feedback_route_path ON feedback(route_path);
CREATE INDEX IF NOT EXISTS idx_feedback_document_id ON feedback(document_id);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);

-- ============================================
-- 4. Content Events Table
-- ============================================
CREATE TABLE IF NOT EXISTS content_events (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  route_path TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('view', 'click', 'search', 'share')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT
);

-- Indexes for content_events
CREATE INDEX IF NOT EXISTS idx_content_events_route_path ON content_events(route_path);
CREATE INDEX IF NOT EXISTS idx_content_events_document_id ON content_events(document_id);
CREATE INDEX IF NOT EXISTS idx_content_events_event_type ON content_events(event_type);
CREATE INDEX IF NOT EXISTS idx_content_events_created_at ON content_events(created_at DESC);

-- ============================================
-- 5. Settings Table
-- ============================================
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for settings
CREATE INDEX IF NOT EXISTS idx_settings_updated_at ON settings(updated_at DESC);

-- ============================================
-- Initial Settings Data
-- ============================================
INSERT INTO settings (key, value, updated_at)
VALUES
  ('registration_enabled', 'true', NOW()),
  ('site_name', 'ByteForge', NOW()),
  ('site_description', '构筑于代码与协议之上的数字熔炉', NOW())
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- Helper Functions
-- ============================================

-- Function to clean up expired refresh tokens
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM refresh_tokens
  WHERE expires_at < NOW() OR revoked = TRUE;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get user statistics
CREATE OR REPLACE FUNCTION get_user_stats()
RETURNS TABLE (
  total_users BIGINT,
  active_users BIGINT,
  admin_users BIGINT,
  new_users_this_month BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT AS total_users,
    COUNT(*) FILTER (WHERE is_active = TRUE)::BIGINT AS active_users,
    COUNT(*) FILTER (WHERE role = 'admin')::BIGINT AS admin_users,
    COUNT(*) FILTER (WHERE created_at >= DATE_TRUNC('month', NOW()))::BIGINT AS new_users_this_month
  FROM users;
END;
$$ LANGUAGE plpgsql;

-- Function to get content statistics
CREATE OR REPLACE FUNCTION get_content_stats()
RETURNS TABLE (
  total_events BIGINT,
  total_views BIGINT,
  total_clicks BIGINT,
  total_searches BIGINT,
  total_feedback BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*)::BIGINT FROM content_events) AS total_events,
    (SELECT COUNT(*)::BIGINT FROM content_events WHERE event_type = 'view') AS total_views,
    (SELECT COUNT(*)::BIGINT FROM content_events WHERE event_type = 'click') AS total_clicks,
    (SELECT COUNT(*)::BIGINT FROM content_events WHERE event_type = 'search') AS total_searches,
    (SELECT COUNT(*)::BIGINT FROM feedback) AS total_feedback;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- Views for Analytics
-- ============================================

-- Daily statistics view
CREATE OR REPLACE VIEW daily_stats AS
SELECT
  DATE(created_at) AS date,
  COUNT(*) AS total_events,
  COUNT(*) FILTER (WHERE event_type = 'view') AS views,
  COUNT(*) FILTER (WHERE event_type = 'click') AS clicks,
  COUNT(*) FILTER (WHERE event_type = 'search') AS searches
FROM content_events
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Top documents view
CREATE OR REPLACE VIEW top_documents AS
SELECT
  document_id,
  COUNT(*) AS total_events,
  COUNT(*) FILTER (WHERE event_type = 'view') AS views,
  COUNT(*) FILTER (WHERE event_type = 'click') AS clicks,
  MAX(created_at) AS last_activity
FROM content_events
WHERE document_id IS NOT NULL
GROUP BY document_id
ORDER BY total_events DESC
LIMIT 100;

-- Recent feedback view
CREATE OR REPLACE VIEW recent_feedback AS
SELECT
  id,
  document_id,
  route_path,
  LEFT(message, 100) AS message_preview,
  created_at
FROM feedback
ORDER BY created_at DESC
LIMIT 100;

-- ============================================
-- Maintenance Tasks
-- ============================================

-- Create a scheduled job to clean up expired tokens (if pg_cron is available)
-- SELECT cron.schedule('cleanup-tokens', '0 0 * * *', 'SELECT cleanup_expired_tokens()');

-- ============================================
-- Grants (adjust as needed for your environment)
-- ============================================

-- Grant permissions to application user (uncomment and modify as needed)
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE users IS 'User accounts with authentication information';
COMMENT ON TABLE refresh_tokens IS 'JWT refresh tokens for session management';
COMMENT ON TABLE feedback IS 'User feedback submissions';
COMMENT ON TABLE content_events IS 'Content interaction tracking (views, clicks, etc)';
COMMENT ON TABLE settings IS 'Application configuration settings';

COMMENT ON FUNCTION cleanup_expired_tokens() IS 'Removes expired and revoked refresh tokens';
COMMENT ON FUNCTION get_user_stats() IS 'Returns aggregate user statistics';
COMMENT ON FUNCTION get_content_stats() IS 'Returns aggregate content interaction statistics';
