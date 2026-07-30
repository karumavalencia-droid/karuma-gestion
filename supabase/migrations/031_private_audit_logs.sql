-- ─────────────────────────────────────────────────────────────────────────────
-- 031 · private_audit_logs
-- Registro de auditoría de la zona privada (lecturas sensibles, escrituras,
-- borrados, exportaciones, descargas de documentos, eventos MFA).
--
-- Append-only: owner+aal2 puede SELECT e INSERT; NO se permite UPDATE ni DELETE
-- (sin policies para ellos => imposible bajo RLS). El servidor escribe con
-- service role. Nunca se guardan importes en claro sensibles, tokens, secretos
-- MFA ni números de cuenta completos: solo metadatos (acción, recurso, id).
-- Idempotente. No inserta datos reales.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.private_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users (id),
  actor_email TEXT,
  action TEXT NOT NULL,          -- view | create | update | delete | export | download | mfa_enroll | mfa_verify
  resource TEXT NOT NULL,        -- bank_transactions | payroll_records | ...
  resource_id TEXT,
  ip TEXT,
  user_agent TEXT,
  -- Metadatos NO sensibles (nunca importes en claro, tokens ni secretos).
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.private_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_audit_logs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS private_audit_logs_sel ON public.private_audit_logs;
CREATE POLICY private_audit_logs_sel ON public.private_audit_logs
  FOR SELECT TO authenticated
  USING ((SELECT public.is_owner_aal2()));

DROP POLICY IF EXISTS private_audit_logs_ins ON public.private_audit_logs;
CREATE POLICY private_audit_logs_ins ON public.private_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_owner_aal2()));

-- Deliberadamente SIN policies de UPDATE/DELETE => la tabla es inmutable bajo RLS.

CREATE INDEX IF NOT EXISTS idx_private_audit_logs_created
  ON public.private_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_private_audit_logs_resource
  ON public.private_audit_logs (resource, created_at DESC);
