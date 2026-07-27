-- Documento Phase 4: supplier matching, duplicate review, legal delivery and Gmail import provenance.
-- Apply after 039_documento_v1.sql, 040_documento_processing_search.sql and 041_documento_chunks.sql.

ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS duplicate_checked_at timestamptz,
  ADD COLUMN IF NOT EXISTS legal_delivery_status text NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN IF NOT EXISTS legal_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS legal_sent_to text;

ALTER TABLE public.documentos
  DROP CONSTRAINT IF EXISTS documentos_legal_delivery_status_check;

ALTER TABLE public.documentos
  ADD CONSTRAINT documentos_legal_delivery_status_check CHECK (
    legal_delivery_status IN ('not_applicable', 'pending', 'sent', 'not_required')
  );

CREATE INDEX IF NOT EXISTS idx_documentos_legal_delivery
  ON public.documentos (legal_delivery_status, created_at DESC)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.document_duplicate_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id_a uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  document_id_b uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  duplicate_level text NOT NULL CHECK (duplicate_level IN ('exact_duplicate', 'likely_duplicate', 'possible_duplicate')),
  confidence numeric(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'rejected')),
  detected_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (document_id_a <> document_id_b),
  CHECK (document_id_a < document_id_b),
  UNIQUE (document_id_a, document_id_b)
);

CREATE INDEX IF NOT EXISTS idx_document_duplicate_candidates_a
  ON public.document_duplicate_candidates (document_id_a, status, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_duplicate_candidates_b
  ON public.document_duplicate_candidates (document_id_b, status, detected_at DESC);

CREATE TABLE IF NOT EXISTS public.document_supplier_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  supplier_id integer NOT NULL REFERENCES public.suppliers(id) ON DELETE RESTRICT,
  candidate_name text,
  candidate_tax_id text,
  confidence numeric(5,4) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  match_method text NOT NULL CHECK (match_method IN ('exact_name', 'normalized_name', 'token_overlap', 'manual')),
  status text NOT NULL DEFAULT 'suggested' CHECK (status IN ('suggested', 'confirmed', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by_email text,
  UNIQUE (document_id, supplier_id)
);

CREATE INDEX IF NOT EXISTS idx_document_supplier_matches_document
  ON public.document_supplier_matches (document_id, status, confidence DESC);

CREATE TABLE IF NOT EXISTS public.document_email_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gmail_message_id text NOT NULL,
  gmail_attachment_id text NOT NULL,
  gmail_thread_id text,
  sender_email text,
  subject text,
  document_id uuid REFERENCES public.documentos(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'importing' CHECK (status IN ('importing', 'imported', 'skipped', 'failed')),
  error_message text,
  imported_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (gmail_message_id, gmail_attachment_id)
);

CREATE INDEX IF NOT EXISTS idx_document_email_imports_document
  ON public.document_email_imports (document_id, imported_at DESC);

ALTER TABLE public.document_duplicate_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_supplier_matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_email_imports ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_duplicate_candidates TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_supplier_matches TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_email_imports TO service_role;

DROP POLICY IF EXISTS document_duplicate_candidates_service_only ON public.document_duplicate_candidates;
CREATE POLICY document_duplicate_candidates_service_only ON public.document_duplicate_candidates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS document_supplier_matches_service_only ON public.document_supplier_matches;
CREATE POLICY document_supplier_matches_service_only ON public.document_supplier_matches
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS document_email_imports_service_only ON public.document_email_imports;
CREATE POLICY document_email_imports_service_only ON public.document_email_imports
  FOR ALL TO service_role USING (true) WITH CHECK (true);

COMMENT ON TABLE public.document_duplicate_candidates IS
  'Candidate duplicates only. No automatic deletion is allowed.';
COMMENT ON TABLE public.document_supplier_matches IS
  'Supplier matching suggestions; low-confidence matches require owner confirmation.';
