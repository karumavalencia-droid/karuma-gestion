-- ============================================================================
-- 035_ceo_drafts.sql — CEO execution drafts
-- ============================================================================

CREATE TABLE IF NOT EXISTS ceo_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ceo_conversations (id) ON DELETE CASCADE,
  draft_type text NOT NULL CHECK (draft_type IN ('purchase_note', 'staff_message', 'review_reply', 'ops_note')),
  title text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'reviewed', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ceo_drafts_conversation
  ON ceo_drafts (conversation_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_ceo_drafts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_ceo_drafts_updated_at ON ceo_drafts;
CREATE TRIGGER trg_ceo_drafts_updated_at
  BEFORE UPDATE ON ceo_drafts
  FOR EACH ROW
  EXECUTE FUNCTION set_ceo_drafts_updated_at();

ALTER TABLE ceo_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_manage_ceo_drafts" ON ceo_drafts;
CREATE POLICY "service_manage_ceo_drafts" ON ceo_drafts
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
