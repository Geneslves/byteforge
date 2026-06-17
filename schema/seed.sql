INSERT INTO settings (key, value, updated_at)
VALUES
  ('site_name', 'ByteForge', datetime('now')),
  ('registration_enabled', 'true', datetime('now')),
  ('admin_email', 'admin@byteforge.local', datetime('now'))
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = excluded.updated_at;

