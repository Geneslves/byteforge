-- Migration 003: Optimize indexes for common query patterns
-- Date: 2026-06-15
-- Purpose: Add composite indexes to improve query performance
-- Related: functions/api/admin/content-stats.js, functions/api/admin/feedback.js

-- Composite index for content_events queries that filter by document_id and event_type
-- Optimizes queries like:
-- SELECT event_type, COUNT(*) FROM content_events
-- WHERE document_id = ? GROUP BY event_type
CREATE INDEX IF NOT EXISTS idx_content_events_doc_type_time
ON content_events(document_id, event_type, created_at DESC);

-- Composite index for feedback queries that filter by document_id and sort by time
-- Optimizes queries like:
-- SELECT * FROM feedback WHERE document_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_feedback_doc_time
ON feedback(document_id, created_at DESC);

-- Composite index for content_events queries that filter by route_path
-- Optimizes queries like:
-- SELECT * FROM content_events WHERE route_path = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_content_events_route_time
ON content_events(route_path, created_at DESC);

-- Update migration version
UPDATE settings SET value = '003', updated_at = datetime('now')
WHERE key = 'migration_version';
