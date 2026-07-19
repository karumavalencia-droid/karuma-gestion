-- ============================================================================
-- 033_ceo_actions.sql — Pending CEO actions
-- ============================================================================

CREATE TABLE IF NOT EXISTS ceo_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ceo_conversations (id) ON DELETE CASCADE,
  label text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ceo_actions_conversation
  ON ceo_actions (conversation_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_ceo_actions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ceo_actions_updated_at ON ceo_actions;
CREATE TRIGGER trg_ceo_actions_updated_at
  BEFORE UPDATE ON ceo_actions
  FOR EACH ROW
  EXECUTE FUNCTION set_ceo_actions_updated_at();

ALTER TABLE ceo_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_manage_ceo_actions" ON ceo_actions;
CREATE POLICY "service_manage_ceo_actions" ON ceo_actions
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
