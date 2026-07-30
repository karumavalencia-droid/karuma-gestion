-- ─────────────────────────────────────────────────────────────────────────────
-- 030 · private_financial_documents
-- Metadatos de documentos financieros privados (el binario vive en el bucket
-- privado 'private-finance', ver 032). Solo owner + aal2.
-- Idempotente. No inserta datos reales.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.private_financial_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Ruta dentro del bucket privado. Nunca una URL pública.
  storage_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  category TEXT NOT NULL DEFAULT 'otros',   -- banco | nomina | alquiler | otros
  description TEXT,
  uploaded_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

SELECT public._apply_owner_aal2_policies('public.private_financial_documents');

CREATE INDEX IF NOT EXISTS idx_private_documents_created
  ON public.private_financial_documents (created_at DESC);
