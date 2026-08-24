CREATE TABLE IF NOT EXISTS instagram_studio_settings (
  profile_name TEXT PRIMARY KEY CHECK (profile_name = 'Trinitie'),
  weekly_rhythm JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS instagram_templates (
  id UUID PRIMARY KEY,
  owner_name TEXT NOT NULL DEFAULT 'Trinitie' CHECK (owner_name = 'Trinitie'),
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('Post overlay', 'Carousel frame', 'Story', 'Reel cover', 'Background', 'Video end card')),
  aspect_ratio TEXT NOT NULL,
  source_url TEXT NOT NULL,
  has_transparency BOOLEAN,
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS instagram_templates_owner_idx
  ON instagram_templates(owner_name, favorite DESC, created_at DESC);
