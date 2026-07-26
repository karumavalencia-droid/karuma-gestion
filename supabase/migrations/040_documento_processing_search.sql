-- Documento Phase 2: processing metadata and PostgreSQL keyword search.
-- Apply only after 039_documento_v1.sql.
--
-- PostgreSQL does not allow the STABLE concat_ws/array_to_string polymorphic
-- functions directly in a generated column. This text[]-specific immutable
-- wrapper keeps the generated expression deterministic while preserving tag
-- search.

CREATE OR REPLACE FUNCTION public.documento_search_text(
  p_title text,
  p_legacy_name text,
  p_original_filename text,
  p_invoice_number text,
  p_payment_status text,
  p_extracted_text text,
  p_tags text[]
)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path = ''
AS $$
  SELECT
    COALESCE(p_title, '') || ' ' ||
    COALESCE(p_legacy_name, '') || ' ' ||
    COALESCE(p_original_filename, '') || ' ' ||
    COALESCE(p_invoice_number, '') || ' ' ||
    COALESCE(p_payment_status, '') || ' ' ||
    COALESCE(p_extracted_text, '') || ' ' ||
    COALESCE(array_to_string(p_tags, ' '), '');
$$;

REVOKE ALL ON FUNCTION public.documento_search_text(
  text, text, text, text, text, text, text[]
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.documento_search_text(
  text, text, text, text, text, text, text[]
) TO service_role;

ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS search_vector tsvector GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      public.documento_search_text(
        title,
        nombre,
        original_filename,
        invoice_number,
        payment_status,
        extracted_text,
        tags
      )
    )
  ) STORED;

CREATE INDEX IF NOT EXISTS idx_documentos_search_vector
  ON public.documentos USING gin (search_vector);

CREATE INDEX IF NOT EXISTS idx_documentos_needs_review
  ON public.documentos (status, human_verified, created_at DESC)
  WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.documentos.search_vector IS
  'Keyword search index. Semantic chunks and embeddings are intentionally deferred to Phase 3.';
