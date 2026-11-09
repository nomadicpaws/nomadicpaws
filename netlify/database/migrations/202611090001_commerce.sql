-- Additive migration: do not alter Journal, identity, media, or historical event tables.
CREATE TABLE IF NOT EXISTS commerce_inventory (
  sku TEXT PRIMARY KEY,
  on_hand INTEGER NOT NULL DEFAULT 0 CHECK (on_hand >= 0),
  reserved INTEGER NOT NULL DEFAULT 0 CHECK (reserved >= 0 AND reserved <= on_hand)
);
INSERT INTO commerce_inventory (sku) VALUES ('NP-PEZ-LION'), ('NP-PEZ-NILGAI'), ('NP-PEZ-CARP'), ('NP-PEZ-DEVIL') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS commerce_orders (
  id UUID PRIMARY KEY,
  request_hash TEXT NOT NULL,
  mode TEXT NOT NULL CHECK (mode IN ('test', 'live')),
  channel TEXT NOT NULL CHECK (channel IN ('web', 'pos')),
  method TEXT NOT NULL CHECK (method IN ('stripe', 'cash')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled', 'review', 'partially_refunded', 'refunded')),
  items JSONB NOT NULL,
  effects JSONB NOT NULL,
  subtotal_cents INTEGER NOT NULL,
  shipping_cents INTEGER NOT NULL,
  tax_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'usd',
  stripe_session_id TEXT UNIQUE,
  stripe_url TEXT,
  stripe_payment_intent_id TEXT UNIQUE,
  refunded_cents INTEGER NOT NULL DEFAULT 0,
  payment_details JSONB,
  cash_tendered_cents INTEGER,
  cash_change_cents INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS commerce_events (
  id TEXT PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES commerce_orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS commerce_stock_movements (
  id BIGSERIAL PRIMARY KEY,
  request_id UUID NOT NULL,
  sku TEXT NOT NULL REFERENCES commerce_inventory(sku),
  quantity_delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  order_id UUID REFERENCES commerce_orders(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (request_id, sku)
);
CREATE INDEX IF NOT EXISTS commerce_orders_status_idx ON commerce_orders(status, created_at);
CREATE TABLE IF NOT EXISTS commerce_checkout_limits (
  client_key TEXT PRIMARY KEY,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  attempts INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS commerce_cash_refunds (
  request_id UUID PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES commerce_orders(id),
  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
