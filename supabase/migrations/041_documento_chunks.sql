-- Documento Phase 3: evidence chunks and optional pgvector retrieval.
-- Apply after 039_documento_v1.sql and 040_documento_processing_search.sql.

CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.document_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documentos(id) ON DELETE CASCADE,
  page_number integer,
  chunk_index integer NOT NULL CHECK (chunk_index >= 0),
  content text NOT NULL CHECK (length(btrim(content)) > 0),
  embedding vector(1536),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document
  ON public.document_chunks (document_id, chunk_index);

CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding
  ON public.document_chunks USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_chunks TO service_role;

DROP POLICY IF EXISTS document_chunks_service_only ON public.document_chunks;
CREATE POLICY document_chunks_service_only ON public.document_chunks
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.match_document_chunks(
  query_embedding vector(1536),
  match_threshold double precision DEFAULT 0.72,
  match_count integer DEFAULT 12
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  page_number integer,
  chunk_index integer,
  content text,
  metadata jsonb,
  similarity double precision
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    dc.id,
    dc.document_id,
    dc.page_number,
    dc.chunk_index,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity
  FROM public.document_chunks dc
  JOIN public.documentos d ON d.id = dc.document_id
  WHERE dc.embedding IS NOT NULL
    AND d.deleted_at IS NULL
    AND 1 - (dc.embedding <=> query_embedding) >= match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT LEAST(GREATEST(match_count, 1), 50);
$$;

REVOKE ALL ON FUNCTION public.match_document_chunks(vector(1536), double precision, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(vector(1536), double precision, integer) TO service_role;

COMMENT ON TABLE public.document_chunks IS
  'Evidence chunks for Documento retrieval. Source documents remain authoritative originals.';
