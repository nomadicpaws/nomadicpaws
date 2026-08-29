ALTER TABLE instagram_post_drafts
  DROP CONSTRAINT IF EXISTS instagram_post_drafts_status_check;

ALTER TABLE instagram_post_drafts
  ADD CONSTRAINT instagram_post_drafts_status_check
  CHECK (status IN ('Draft', 'Ready', 'Handed Off', 'Posted'));
