ALTER TABLE instagram_post_drafts
  ADD COLUMN IF NOT EXISTS assigned_to TEXT NOT NULL DEFAULT 'Trinitie'
    CHECK (assigned_to IN ('Katie', 'Trinitie')),
  ADD COLUMN IF NOT EXISTS handoff_note TEXT NOT NULL DEFAULT '';

