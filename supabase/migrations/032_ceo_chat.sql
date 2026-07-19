-- ============================================================================
-- 032_ceo_chat.sql — CEO chat sessions and message history
-- ----------------------------------------------------------------------------
-- Stores the first version of the AI CEO conversation history in Supabase.
-- Access pattern:
--   - Only server-side API routes use the service role key.
--   - No client-side Supabase access is required for these tables.
--   - RLS is enabled as defense in depth with service-role-only policies.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ceo_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email text NOT NULL,
  user_name text NOT NULL,
  role text NOT NULL,
  title text NOT NULL DEFAULT 'AI CEO',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ceo_conversations_user
  ON ceo_conversations (user_email, updated_at DESC);

CREATE TABLE IF NOT EXISTS ceo_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES ceo_conversations (id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user', 'assistant', 'tool', 'system')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ceo_messages_conversation
  ON ceo_messages (conversation_id, created_at);

CREATE OR REPLACE FUNCTION set_ceo_conversations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS trg_ceo_conversations_updated_at ON ceo_conversations;
CREATE TRIGGER trg_ceo_conversations_updated_at
  BEFORE UPDATE ON ceo_conversations
  FOR EACH ROW
  EXECUTE FUNCTION set_ceo_conversations_updated_at();

ALTER TABLE ceo_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ceo_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_manage_ceo_conversations" ON ceo_conversations;
CREATE POLICY "service_manage_ceo_conversations" ON ceo_conversations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "service_manage_ceo_messages" ON ceo_messages;
CREATE POLICY "service_manage_ceo_messages" ON ceo_messages
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
