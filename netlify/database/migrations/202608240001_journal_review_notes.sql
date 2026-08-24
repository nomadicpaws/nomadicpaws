CREATE TABLE IF NOT EXISTS journal_review_notes (
  id UUID PRIMARY KEY,
  story_slug TEXT NOT NULL,
  story_version TEXT NOT NULL,
  reviewer TEXT NOT NULL CHECK (reviewer IN ('Trinitie', 'Mom')),
  note TEXT NOT NULL CHECK (char_length(note) BETWEEN 1 AND 3000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS journal_review_notes_story_idx
  ON journal_review_notes(story_slug, created_at DESC);
