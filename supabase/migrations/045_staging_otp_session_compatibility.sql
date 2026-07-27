-- Staging compatibility: the Documento Preview authenticates through the
-- existing admin SMS challenge. A fresh staging project may intentionally
-- contain only the Documento schema, so keep the temporary OTP store
-- available without requiring the entire legacy identity schema.
--
-- Production already has this table from 029_identity_auth_tables.sql. This
-- migration is deliberately idempotent and does not alter production rows.

CREATE TABLE IF NOT EXISTS public.auth_otp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  expires_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  -- The initial admin flow does not require an account row. Keeping this
  -- nullable avoids a dependency on the legacy auth_accounts table in a
  -- Documento-only staging project.
  account_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_otp_sessions_phone_expires
  ON public.auth_otp_sessions (phone, expires_at DESC)
  WHERE verified_at IS NULL;

ALTER TABLE public.auth_otp_sessions ENABLE ROW LEVEL SECURITY;

-- OTP values are server-only. The API uses SUPABASE_SERVICE_ROLE_KEY; browser
-- roles receive no direct table privileges or RLS policy.
REVOKE ALL ON TABLE public.auth_otp_sessions FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.auth_otp_sessions TO service_role;
