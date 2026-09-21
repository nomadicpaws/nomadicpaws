ALTER TABLE shared_event_checklist_items
  ADD COLUMN IF NOT EXISTS assigned_to TEXT NOT NULL DEFAULT '';
