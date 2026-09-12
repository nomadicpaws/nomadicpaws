CREATE TABLE IF NOT EXISTS journal_story_videos (
  id UUID PRIMARY KEY,
  story_slug TEXT NOT NULL,
  media_id UUID NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  caption TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (story_slug, media_id)
);

CREATE INDEX IF NOT EXISTS journal_story_videos_story_idx
  ON journal_story_videos(story_slug, sort_order, created_at);
