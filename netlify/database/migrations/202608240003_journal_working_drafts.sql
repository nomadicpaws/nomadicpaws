CREATE TABLE IF NOT EXISTS journal_working_drafts (
  story_slug TEXT PRIMARY KEY,
  base_version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'Cheeto Diaries',
  image TEXT NOT NULL DEFAULT '',
  image_alt TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  is_draft BOOLEAN NOT NULL DEFAULT TRUE,
  publish_date TIMESTAMPTZ,
  revision INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS journal_working_versions (
  id UUID PRIMARY KEY,
  story_slug TEXT NOT NULL REFERENCES journal_working_drafts(story_slug) ON DELETE CASCADE,
  revision INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(story_slug, revision)
);

CREATE INDEX IF NOT EXISTS journal_working_versions_story_idx
  ON journal_working_versions(story_slug, revision DESC);
