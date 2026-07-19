-- ============================================================================
-- 036_ceo_change_requests.sql — Karuma AI Change Center V1
-- ----------------------------------------------------------------------------
-- Minimal system-change workflow for owner/manager use inside the CEO area.
-- Stores the request, the structured plan, the risk level, and the lifecycle
-- status. Execution fields for GitHub/Vercel are reserved for later automation.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ceo_change_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_email text NOT NULL,
  created_by_name text NOT NULL,
  created_by_role text NOT NULL,
  title text NOT NULL,
  request_text text NOT NULL,
  summary text NOT NULL,
  risk_level text NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'planned', 'approved', 'executing', 'preview_ready', 'completed', 'failed')),
  plan jsonb NOT NULL DEFAULT '[]'::jsonb,
  github_branch text,
  github_pr_url text,
  vercel_preview_url text,
  execution_notes text,
  approved_at timestamptz,
  preview_ready_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ceo_change_requests_status_created
  ON ceo_change_requests (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_ceo_change_requests_creator
  ON ceo_change_requests (created_by_email, created_at DESC);

CREATE OR REPLACE FUNCTION set_ceo_change_requests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ceo_change_requests_updated_at ON ceo_change_requests;
CREATE TRIGGER trg_ceo_change_requests_updated_at
  BEFORE UPDATE ON ceo_change_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_ceo_change_requests_updated_at();

ALTER TABLE ceo_change_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_manage_ceo_change_requests" ON ceo_change_requests;
CREATE POLICY "service_manage_ceo_change_requests" ON ceo_change_requests
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
