-- App version tracking for in-app updates
CREATE TABLE IF NOT EXISTS app_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_code INTEGER NOT NULL UNIQUE,
  version_name TEXT NOT NULL,
  release_notes TEXT,
  apk_url TEXT NOT NULL,
  apk_public_id TEXT,
  file_size BIGINT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
