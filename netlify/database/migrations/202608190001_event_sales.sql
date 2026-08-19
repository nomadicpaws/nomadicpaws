CREATE TABLE IF NOT EXISTS event_sales (
  id UUID PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('payment_pending', 'paid', 'payment_failed', 'refunded', 'cancelled')),
  mode TEXT NOT NULL CHECK (mode IN ('test', 'live')),
  currency TEXT NOT NULL DEFAULT 'usd',
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  tax_cents INTEGER NOT NULL CHECK (tax_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  stripe_payment_intent_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_sale_items (
  sale_id UUID NOT NULL REFERENCES event_sales(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  snipcart_product_id TEXT NOT NULL,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  PRIMARY KEY (sale_id, sku)
);

CREATE TABLE IF NOT EXISTS stripe_webhook_events (
  stripe_event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  payload_sha256 TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing', 'processed', 'ignored', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS event_inventory_adjustments (
  id UUID PRIMARY KEY,
  sale_id UUID NOT NULL REFERENCES event_sales(id) ON DELETE CASCADE,
  stripe_event_id TEXT NOT NULL REFERENCES stripe_webhook_events(stripe_event_id),
  sku TEXT NOT NULL,
  snipcart_product_id TEXT NOT NULL,
  quantity_delta INTEGER NOT NULL CHECK (quantity_delta <> 0),
  stock_before INTEGER,
  stock_after INTEGER,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'applied', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (sale_id, sku)
);

CREATE TABLE IF NOT EXISTS event_audit_log (
  id BIGSERIAL PRIMARY KEY,
  correlation_id TEXT NOT NULL,
  sale_id UUID REFERENCES event_sales(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  status TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS event_inventory_adjustments_status_idx
  ON event_inventory_adjustments(status, created_at);
CREATE INDEX IF NOT EXISTS event_audit_log_sale_idx
  ON event_audit_log(sale_id, created_at);
