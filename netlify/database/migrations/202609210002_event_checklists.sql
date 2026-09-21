CREATE TABLE IF NOT EXISTS shared_event_checklist_items (
  id UUID PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES shared_calendar_events(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shared_event_checklist_event_idx
  ON shared_event_checklist_items(event_id, completed, created_at);
