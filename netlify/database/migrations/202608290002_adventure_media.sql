CREATE TABLE IF NOT EXISTS adventures (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  private_location TEXT NOT NULL DEFAULT '',
  public_location TEXT NOT NULL DEFAULT '',
  captured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  assigned_to TEXT NOT NULL DEFAULT 'Katie' CHECK (assigned_to IN ('Katie', 'Trinitie')),
  status TEXT NOT NULL DEFAULT 'Idea' CHECK (status IN ('Idea', 'Draft', 'Ready', 'Handed Off', 'Posted')),
  platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_assets (
  id UUID PRIMARY KEY,
  adventure_id UUID REFERENCES adventures(id) ON DELETE SET NULL,
  blob_key TEXT NOT NULL UNIQUE,
  original_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  byte_size BIGINT NOT NULL CHECK (byte_size >= 0),
  width INTEGER,
  height INTEGER,
  duration_seconds NUMERIC,
  kind TEXT NOT NULL CHECK (kind IN ('photo', 'video')),
  status TEXT NOT NULL DEFAULT 'ready' CHECK (status IN ('uploading', 'ready', 'failed', 'archived')),
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT NOT NULL DEFAULT '',
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS media_usage (
  id UUID PRIMARY KEY,
  media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  destination_type TEXT NOT NULL,
  destination_id TEXT NOT NULL,
  treatment JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS adventures_updated_idx ON adventures(updated_at DESC);
CREATE INDEX IF NOT EXISTS media_assets_adventure_idx ON media_assets(adventure_id, created_at ASC);
CREATE INDEX IF NOT EXISTS media_assets_created_idx ON media_assets(created_at DESC);
CREATE INDEX IF NOT EXISTS media_usage_media_idx ON media_usage(media_id, created_at DESC);
