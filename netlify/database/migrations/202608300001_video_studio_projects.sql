CREATE TABLE IF NOT EXISTS video_studio_projects (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  media_id UUID REFERENCES media_assets(id) ON DELETE SET NULL,
  source_story_slug TEXT NOT NULL DEFAULT '',
  platforms JSONB NOT NULL DEFAULT '[]'::jsonb,
  overlays JSONB NOT NULL DEFAULT '[]'::jsonb,
  current_overlay JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Ready', 'Handed Off', 'Posted')),
  assigned_to TEXT NOT NULL DEFAULT 'Katie' CHECK (assigned_to IN ('Katie', 'Trinitie')),
  last_edited_by TEXT NOT NULL CHECK (last_edited_by IN ('Katie', 'Trinitie')),
  created_by UUID REFERENCES app_users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS video_studio_projects_updated_idx
  ON video_studio_projects(updated_at DESC);

CREATE INDEX IF NOT EXISTS video_studio_projects_assignment_idx
  ON video_studio_projects(assigned_to, status, updated_at DESC);
