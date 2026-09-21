ALTER TABLE event_sales
  ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'stripe_terminal'
    CHECK (payment_method IN ('stripe_terminal', 'cash')),
  ADD COLUMN IF NOT EXISTS cash_tendered_cents INTEGER,
  ADD COLUMN IF NOT EXISTS change_due_cents INTEGER;

ALTER TABLE event_inventory_adjustments ALTER COLUMN stripe_event_id DROP NOT NULL;
