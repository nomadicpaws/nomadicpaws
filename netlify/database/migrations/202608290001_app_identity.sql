CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY,
  apple_subject text UNIQUE NOT NULL,
  email text,
  display_name text,
  role text NOT NULL DEFAULT 'pending' CHECK (role IN ('pending', 'katie', 'trinitie', 'mom')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'revoked')),
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_single_katie_idx
  ON app_users ((role)) WHERE role = 'katie' AND status = 'active';

CREATE TABLE IF NOT EXISTS app_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  token_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  last_seen_at timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS app_sessions_user_idx ON app_sessions(user_id);
CREATE INDEX IF NOT EXISTS app_sessions_expiry_idx ON app_sessions(expires_at);

