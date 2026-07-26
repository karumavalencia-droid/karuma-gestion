-- Documento V1: extends the existing public.documentos table.
-- This migration is intentionally additive: the table and private bucket already
-- exist in the live project and the legacy columns remain compatible.

ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS original_filename text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS storage_bucket text NOT NULL DEFAULT 'documentos',
  ADD COLUMN IF NOT EXISTS document_type text NOT NULL DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS subcategory text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS document_date date,
  ADD COLUMN IF NOT EXISTS uploaded_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS processed_at timestamptz,
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual_upload',
  ADD COLUMN IF NOT EXISTS source_email_id text,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS ai_description text,
  ADD COLUMN IF NOT EXISTS extracted_text text,
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_confidence numeric(5,4),
  ADD COLUMN IF NOT EXISTS ai_model text,
  ADD COLUMN IF NOT EXISTS ai_processing_error text,
  ADD COLUMN IF NOT EXISTS parent_document_id uuid,
  ADD COLUMN IF NOT EXISTS duplicate_of_id uuid,
  ADD COLUMN IF NOT EXISTS human_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
  ADD COLUMN IF NOT EXISTS sha256 text,
  ADD COLUMN IF NOT EXISTS company_id uuid,
  ADD COLUMN IF NOT EXISTS restaurant_id uuid,
  ADD COLUMN IF NOT EXISTS supplier_id bigint,
  ADD COLUMN IF NOT EXISTS employee_id uuid,
  ADD COLUMN IF NOT EXISTS document_date_end date,
  ADD COLUMN IF NOT EXISTS invoice_number text,
  ADD COLUMN IF NOT EXISTS currency text,
  ADD COLUMN IF NOT EXISTS amount_net numeric(14,2),
  ADD COLUMN IF NOT EXISTS vat_amount numeric(14,2),
  ADD COLUMN IF NOT EXISTS amount_total numeric(14,2),
  ADD COLUMN IF NOT EXISTS payment_status text,
  ADD COLUMN IF NOT EXISTS payment_date date,
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS contract_start_date date,
  ADD COLUMN IF NOT EXISTS contract_end_date date,
  ADD COLUMN IF NOT EXISTS renewal_date date,
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS created_by_email text,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by_email text;

UPDATE public.documentos
SET
  title = COALESCE(title, nombre),
  original_filename = COALESCE(original_filename, nombre),
  file_size = COALESCE(file_size, tamano_bytes),
  storage_bucket = COALESCE(storage_bucket, 'documentos'),
  uploaded_at = COALESCE(uploaded_at, created_at),
  updated_at = COALESCE(updated_at, created_at)
WHERE title IS NULL
   OR original_filename IS NULL
   OR file_size IS NULL
   OR storage_bucket IS NULL
   OR uploaded_at IS NULL
   OR updated_at IS NULL;

ALTER TABLE public.documentos
  DROP CONSTRAINT IF EXISTS documentos_document_type_check,
  DROP CONSTRAINT IF EXISTS documentos_status_check;

ALTER TABLE public.documentos
  ADD CONSTRAINT documentos_document_type_check CHECK (
    document_type IN (
      'invoice', 'contract', 'bank_receipt', 'employee_document',
      'menu', 'recipe', 'image', 'screenshot', 'note', 'idea',
      'legal', 'tax', 'other'
    )
  ),
  ADD CONSTRAINT documentos_status_check CHECK (
    status IN (
      'uploading', 'uploaded', 'extracting', 'classifying',
      'needs_review', 'processed', 'failed', 'archived'
    )
  );

CREATE INDEX IF NOT EXISTS idx_documentos_document_type ON public.documentos (document_type);
CREATE INDEX IF NOT EXISTS idx_documentos_status ON public.documentos (status);
CREATE INDEX IF NOT EXISTS idx_documentos_supplier_id ON public.documentos (supplier_id);
CREATE INDEX IF NOT EXISTS idx_documentos_company_id ON public.documentos (company_id);
CREATE INDEX IF NOT EXISTS idx_documentos_document_date ON public.documentos (document_date DESC);
CREATE INDEX IF NOT EXISTS idx_documentos_invoice_number ON public.documentos (invoice_number);
CREATE INDEX IF NOT EXISTS idx_documentos_payment_status ON public.documentos (payment_status);
CREATE INDEX IF NOT EXISTS idx_documentos_contract_end_date ON public.documentos (contract_end_date);
CREATE INDEX IF NOT EXISTS idx_documentos_created_at ON public.documentos (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_documentos_sha256 ON public.documentos (sha256) WHERE sha256 IS NOT NULL;

CREATE OR REPLACE FUNCTION public.set_documentos_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_documentos_updated_at ON public.documentos;
CREATE TRIGGER trg_documentos_updated_at
  BEFORE UPDATE ON public.documentos
  FOR EACH ROW EXECUTE FUNCTION public.set_documentos_updated_at();

CREATE TABLE IF NOT EXISTS public.document_processing_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  stage text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempt integer NOT NULL DEFAULT 1 CHECK (attempt > 0),
  model text,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_processing_runs_document
  ON public.document_processing_runs (document_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.document_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  action text NOT NULL,
  before_data jsonb,
  after_data jsonb,
  actor_email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_document_audit_log_document
  ON public.document_audit_log (document_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  supplier_id bigint,
  raw_product_name text NOT NULL,
  normalized_product_id uuid,
  description text,
  quantity numeric(14,4),
  unit text,
  unit_price numeric(14,4),
  tax_rate numeric(6,3),
  line_total numeric(14,2),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_items_document ON public.invoice_items (document_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_supplier ON public.invoice_items (supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON public.invoice_items (normalized_product_id);

ALTER TABLE public.documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_processing_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

-- New public tables are no longer always exposed/granted through the Data API.
-- These server-only routes use the service role after their own cookie check.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documentos TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_processing_runs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_audit_log TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_items TO service_role;

DROP POLICY IF EXISTS documento_service_only ON public.documentos;
CREATE POLICY documento_service_only ON public.documentos
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS document_processing_service_only ON public.document_processing_runs;
CREATE POLICY document_processing_service_only ON public.document_processing_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS document_audit_service_only ON public.document_audit_log;
CREATE POLICY document_audit_service_only ON public.document_audit_log
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS invoice_items_service_only ON public.invoice_items;
CREATE POLICY invoice_items_service_only ON public.invoice_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- The live project already contains a private `documentos` bucket.
-- Storage policies remain server-only; the Next.js API uses service_role and
-- produces short-lived signed URLs after its own session/owner check.
DROP POLICY IF EXISTS documento_storage_service_only ON storage.objects;
CREATE POLICY documento_storage_service_only ON storage.objects
  FOR ALL TO service_role
  USING (bucket_id = 'documentos')
  WITH CHECK (bucket_id = 'documentos');
