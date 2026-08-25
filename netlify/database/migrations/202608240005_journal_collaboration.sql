ALTER TABLE journal_review_notes
  ADD COLUMN IF NOT EXISTS anchor_type TEXT NOT NULL DEFAULT 'general'
    CHECK (anchor_type IN ('general', 'paragraph', 'selection')),
  ADD COLUMN IF NOT EXISTS anchor_id TEXT,
  ADD COLUMN IF NOT EXISTS quoted_text TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'resolved', 'needs_work')),
  ADD COLUMN IF NOT EXISTS revised_text TEXT,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS journal_contributions (
  id UUID PRIMARY KEY,
  contributor TEXT NOT NULL CHECK (contributor = 'Mom'),
  title TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL DEFAULT '',
  memory_clue TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'submitted', 'editing', 'archived')),
  needs_adventure_match BOOLEAN NOT NULL DEFAULT TRUE,
  needs_photo_selection BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  submitted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS journal_contributions_status_idx
  ON journal_contributions(status, updated_at DESC);
