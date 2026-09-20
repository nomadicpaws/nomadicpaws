CREATE TABLE IF NOT EXISTS shared_calendar_events (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  location TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Planned' CHECK (status IN ('Planned', 'Confirmed', 'Done', 'Canceled')),
  created_by TEXT NOT NULL CHECK (created_by IN ('Katie', 'Trinitie')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS shared_calendar_events_date_idx
  ON shared_calendar_events(event_date, status, updated_at DESC);
