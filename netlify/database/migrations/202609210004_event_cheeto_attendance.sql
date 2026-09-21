ALTER TABLE shared_calendar_events
  ADD COLUMN IF NOT EXISTS cheeto_attending BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE shared_event_checklist_items
  ADD COLUMN IF NOT EXISTS cheeto_only BOOLEAN NOT NULL DEFAULT FALSE;
