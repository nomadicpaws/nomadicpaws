CREATE TABLE IF NOT EXISTS instagram_post_drafts (
  id UUID PRIMARY KEY,
  owner_name TEXT NOT NULL DEFAULT 'Trinitie' CHECK (owner_name = 'Trinitie'),
  title TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  media_urls JSONB NOT NULL DEFAULT '[]'::jsonb,
  target_date DATE,
  theme TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Ready', 'Posted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS instagram_post_drafts_target_idx
  ON instagram_post_drafts(owner_name, target_date, status, updated_at DESC);
