ALTER TABLE journal_working_versions
  DROP CONSTRAINT IF EXISTS journal_working_versions_story_slug_fkey;

ALTER TABLE journal_working_versions
  ADD CONSTRAINT journal_working_versions_story_slug_fkey
  FOREIGN KEY (story_slug)
  REFERENCES journal_working_drafts(story_slug)
  ON UPDATE CASCADE
  ON DELETE CASCADE;
