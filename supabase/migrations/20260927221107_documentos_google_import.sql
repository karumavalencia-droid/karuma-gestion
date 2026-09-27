-- Bring the checked-in documentos schema up to the fields used by uploads and
-- Google imports. Existing installations may already have some of these fields.
ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS tipo_documento text,
  ADD COLUMN IF NOT EXISTS document_type text,
  ADD COLUMN IF NOT EXISTS source_type text,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS source_file_id text,
  ADD COLUMN IF NOT EXISTS source_email_id text,
  ADD COLUMN IF NOT EXISTS file_sha256 text,
  ADD COLUMN IF NOT EXISTS sha256 text,
  ADD COLUMN IF NOT EXISTS processing_status text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS storage_bucket text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS empleado_id uuid,
  ADD COLUMN IF NOT EXISTS employee_id uuid,
  ADD COLUMN IF NOT EXISTS periodo text,
  ADD COLUMN IF NOT EXISTS proveedor text,
  ADD COLUMN IF NOT EXISTS nif_proveedor text,
  ADD COLUMN IF NOT EXISTS fecha_documento date,
  ADD COLUMN IF NOT EXISTS numero_documento text,
  ADD COLUMN IF NOT EXISTS subtotal numeric(12,2),
  ADD COLUMN IF NOT EXISTS iva numeric(12,2),
  ADD COLUMN IF NOT EXISTS total numeric(12,2),
  ADD COLUMN IF NOT EXISTS moneda text,
  ADD COLUMN IF NOT EXISTS extraction_confidence numeric;

-- 034 predates the invoice category; preserve existing allowed values.
ALTER TABLE public.documentos DROP CONSTRAINT IF EXISTS documentos_categoria_check;
ALTER TABLE public.documentos ADD CONSTRAINT documentos_categoria_check
  CHECK (categoria IN ('bancos','contratos','nominas','impuestos',
                       'seguros','licencias','facturas','otros'));

-- Fail visibly if historical duplicates exist. Reconcile those rows before
-- enforcing uniqueness; silently dropping a document would lose provenance.
CREATE UNIQUE INDEX IF NOT EXISTS documentos_source_file_id_unique
  ON public.documentos (source_file_id) WHERE source_file_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS documentos_file_sha256_unique
  ON public.documentos (file_sha256) WHERE file_sha256 IS NOT NULL;
