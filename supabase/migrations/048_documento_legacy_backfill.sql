-- Map the production invoice-ingestion columns (Spanish names) into Documento
-- V1's traceable analytics fields. The migration is additive and idempotent;
-- legacy columns remain untouched for rollback and audit purposes.

UPDATE public.documentos
SET
  document_type = CASE
    WHEN lower(COALESCE(tipo_documento, '')) = 'factura' THEN 'invoice'
    ELSE document_type
  END,
  document_date = COALESCE(document_date, fecha_documento),
  invoice_number = COALESCE(invoice_number, numero_documento),
  amount_net = COALESCE(amount_net, subtotal),
  vat_amount = COALESCE(vat_amount, iva),
  amount_total = COALESCE(amount_total, total),
  currency = COALESCE(currency, moneda),
  source = CASE
    WHEN source_type IS NOT NULL AND btrim(source_type) <> '' THEN source_type
    ELSE source
  END,
  sha256 = COALESCE(sha256, file_sha256),
  ai_confidence = COALESCE(ai_confidence, extraction_confidence),
  duplicate_of_id = COALESCE(duplicate_of_id, duplicate_of),
  status = CASE
    WHEN processing_status = 'processed' THEN 'processed'
    WHEN processing_status IN ('failed', 'error') THEN 'failed'
    WHEN processing_status IN ('processing', 'extracting') THEN 'extracting'
    ELSE status
  END,
  supplier_id = COALESCE(
    supplier_id,
    (
      SELECT supplier.id
      FROM public.suppliers AS supplier
      WHERE
        (
          nif_proveedor IS NOT NULL
          AND supplier.tax_id IS NOT NULL
          AND lower(btrim(supplier.tax_id)) = lower(btrim(nif_proveedor))
        )
        OR (
          proveedor IS NOT NULL
          AND lower(btrim(supplier.name)) = lower(btrim(proveedor))
        )
      ORDER BY
        CASE
          WHEN nif_proveedor IS NOT NULL
            AND supplier.tax_id IS NOT NULL
            AND lower(btrim(supplier.tax_id)) = lower(btrim(nif_proveedor))
          THEN 0
          ELSE 1
        END,
        supplier.id
      LIMIT 1
    )
  )
WHERE
  tipo_documento IS NOT NULL
  OR fecha_documento IS NOT NULL
  OR numero_documento IS NOT NULL
  OR total IS NOT NULL
  OR source_type IS NOT NULL
  OR file_sha256 IS NOT NULL
  OR extraction_confidence IS NOT NULL
  OR duplicate_of IS NOT NULL
  OR proveedor IS NOT NULL
  OR nif_proveedor IS NOT NULL;

COMMENT ON COLUMN public.documentos.human_verified IS
  'True only after explicit owner confirmation. Legacy processed invoices remain unconfirmed until reviewed.';
