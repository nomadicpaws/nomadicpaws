CREATE TABLE IF NOT EXISTS event_staff (
  id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'helper' CHECK (role IN ('manager', 'helper')),
  code_salt TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_signed_in_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS event_staff_active_idx
  ON event_staff(active, display_name);
