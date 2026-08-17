-- Cross-device state for supplier catalog ordering.
-- The application uses the signed Karuma session and the service role on the
-- server; the table is intentionally not writable through the public Data API.
CREATE TABLE IF NOT EXISTS public.supplier_catalog_state (
  id BIGSERIAL PRIMARY KEY,
  user_email TEXT NOT NULL,
  supplier_slug TEXT NOT NULL,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_email, supplier_slug)
);

CREATE INDEX IF NOT EXISTS idx_supplier_catalog_state_user_supplier
  ON public.supplier_catalog_state (user_email, supplier_slug);

ALTER TABLE public.supplier_catalog_state ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.supplier_catalog_state FROM anon, authenticated;
GRANT ALL ON TABLE public.supplier_catalog_state TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.supplier_catalog_state_id_seq TO service_role;
