-- The importer uses the service role. Keep cursors private and durable so
-- a timed out invocation can replay its last unfinished page safely.
CREATE TABLE IF NOT EXISTS public.documento_google_sync_checkpoints (
  source_key text PRIMARY KEY,
  page_token text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documento_google_sync_checkpoints ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.documento_google_sync_checkpoints FROM anon, authenticated;
