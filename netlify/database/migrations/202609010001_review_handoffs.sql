ALTER TABLE journal_working_drafts
  ADD COLUMN IF NOT EXISTS review_status TEXT NOT NULL DEFAULT 'draft'
    CHECK (review_status IN ('draft', 'ready_for_mom', 'back_with_katie')),
  ADD COLUMN IF NOT EXISTS review_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS review_completed_at TIMESTAMPTZ;

ALTER TABLE instagram_post_drafts
  ADD COLUMN IF NOT EXISTS shared_with_mom BOOLEAN NOT NULL DEFAULT FALSE;

