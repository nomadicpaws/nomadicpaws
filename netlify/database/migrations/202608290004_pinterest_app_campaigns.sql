CREATE TABLE IF NOT EXISTS pinterest_app_campaigns (
  post_slug TEXT PRIMARY KEY,
  campaign JSONB NOT NULL,
  updated_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

