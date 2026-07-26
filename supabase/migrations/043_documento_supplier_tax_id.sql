-- Documento Phase 4 follow-up: make CIF/NIF matching possible without
-- rebuilding the existing integer-keyed suppliers table.
-- Apply after 042_documento_associations_automation.sql.

ALTER TABLE public.suppliers
  ADD COLUMN IF NOT EXISTS tax_id text;

GRANT SELECT, UPDATE ON public.suppliers TO service_role;

CREATE INDEX IF NOT EXISTS idx_suppliers_tax_id
  ON public.suppliers (lower(tax_id))
  WHERE tax_id IS NOT NULL AND tax_id <> '';

ALTER TABLE public.document_supplier_matches
  DROP CONSTRAINT IF EXISTS document_supplier_matches_match_method_check;

ALTER TABLE public.document_supplier_matches
  ADD CONSTRAINT document_supplier_matches_match_method_check CHECK (
    match_method IN ('exact_name', 'normalized_name', 'token_overlap', 'exact_tax_id', 'manual')
  );

COMMENT ON COLUMN public.suppliers.tax_id IS
  'CIF/NIF/VAT identifier used for conservative Documento supplier matching.';
