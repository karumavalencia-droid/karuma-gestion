-- Documento review completion: field-level protection for invoice lines and
-- atomic, audited owner actions. Functions are SECURITY INVOKER and executable
-- only by the server-side service role.

ALTER TABLE public.documentos
  ADD COLUMN IF NOT EXISTS invoice_items_human_verified boolean NOT NULL DEFAULT false;

ALTER TABLE public.invoice_items
  ADD COLUMN IF NOT EXISTS human_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_by_email text;

CREATE INDEX IF NOT EXISTS idx_documentos_review_queue
  ON public.documentos (status, created_at DESC)
  WHERE deleted_at IS NULL AND human_verified = false;

CREATE OR REPLACE FUNCTION public.confirm_document_batch(
  p_document_ids uuid[],
  p_actor_email text
)
RETURNS TABLE(document_id uuid)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_before public.documentos%ROWTYPE;
  v_after public.documentos%ROWTYPE;
  v_requested_count integer;
  v_existing_count integer;
BEGIN
  v_requested_count := COALESCE((
    SELECT count(DISTINCT requested.requested_id)
    FROM unnest(p_document_ids) AS requested(requested_id)
  ), 0);

  IF v_requested_count = 0 OR v_requested_count > 50 THEN
    RAISE EXCEPTION 'The batch must contain between 1 and 50 unique documents';
  END IF;

  IF p_actor_email IS NULL OR btrim(p_actor_email) = '' THEN
    RAISE EXCEPTION 'Actor email is required';
  END IF;

  -- Lock every existing target before validating the batch so a concurrent
  -- archive cannot turn an all-or-nothing confirmation into a partial update.
  PERFORM d.id
  FROM public.documentos d
  WHERE d.id = ANY(p_document_ids)
  ORDER BY d.created_at, d.id
  FOR UPDATE;

  SELECT count(*)
  INTO v_existing_count
  FROM public.documentos d
  WHERE d.id = ANY(p_document_ids)
    AND d.deleted_at IS NULL;

  IF v_existing_count <> v_requested_count THEN
    RAISE EXCEPTION 'One or more documents do not exist or are archived'
      USING ERRCODE = 'P0002';
  END IF;

  FOR v_before IN
    SELECT d.*
    FROM public.documentos d
    WHERE d.id = ANY(p_document_ids)
      AND d.deleted_at IS NULL
    ORDER BY d.created_at, d.id
    FOR UPDATE
  LOOP
    UPDATE public.documentos
    SET
      human_verified = true,
      invoice_items_human_verified = CASE
        WHEN v_before.document_type = 'invoice' THEN true
        ELSE invoice_items_human_verified
      END,
      status = 'processed',
      updated_by_email = left(p_actor_email, 320),
      updated_at = now()
    WHERE id = v_before.id
    RETURNING * INTO v_after;

    IF v_before.document_type = 'invoice' THEN
      UPDATE public.invoice_items AS item
      SET
        human_verified = true,
        updated_at = now(),
        updated_by_email = left(p_actor_email, 320)
      WHERE item.document_id = v_before.id;
    END IF;

    INSERT INTO public.document_audit_log (
      document_id,
      action,
      before_data,
      after_data,
      actor_email
    )
    VALUES (
      v_after.id,
      'batch_confirmed',
      to_jsonb(v_before),
      to_jsonb(v_after),
      left(p_actor_email, 320)
    );

    document_id := v_after.id;
    RETURN NEXT;
  END LOOP;
END;
$$;

CREATE OR REPLACE FUNCTION public.replace_document_invoice_items(
  p_document_id uuid,
  p_items jsonb,
  p_actor_email text
)
RETURNS SETOF public.invoice_items
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_before jsonb;
  v_after jsonb;
  v_supplier_id bigint;
  v_document_type text;
  v_item_count integer;
BEGIN
  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Invoice items must be a JSON array';
  END IF;

  v_item_count := jsonb_array_length(p_items);
  IF v_item_count > 200 THEN
    RAISE EXCEPTION 'An invoice cannot contain more than 200 editable items';
  END IF;

  IF p_actor_email IS NULL OR btrim(p_actor_email) = '' THEN
    RAISE EXCEPTION 'Actor email is required';
  END IF;

  SELECT d.supplier_id, d.document_type
  INTO v_supplier_id, v_document_type
  FROM public.documentos d
  WHERE d.id = p_document_id
    AND d.deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found or archived'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_document_type <> 'invoice' THEN
    RAISE EXCEPTION 'Invoice items can only be saved for invoice documents';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_items) AS item(value)
    WHERE NULLIF(btrim(item.value->>'raw_product_name'), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Every invoice item requires its original product name';
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.created_at, i.id), '[]'::jsonb)
  INTO v_before
  FROM public.invoice_items i
  WHERE i.document_id = p_document_id;

  DELETE FROM public.invoice_items
  WHERE document_id = p_document_id;

  INSERT INTO public.invoice_items (
    document_id,
    supplier_id,
    raw_product_name,
    normalized_product_id,
    description,
    quantity,
    unit,
    unit_price,
    tax_rate,
    line_total,
    human_verified,
    updated_at,
    updated_by_email
  )
  SELECT
    p_document_id,
    COALESCE(NULLIF(item.value->>'supplier_id', '')::bigint, v_supplier_id),
    left(btrim(item.value->>'raw_product_name'), 500),
    NULLIF(item.value->>'normalized_product_id', '')::uuid,
    NULLIF(left(btrim(item.value->>'description'), 500), ''),
    NULLIF(item.value->>'quantity', '')::numeric(14,4),
    NULLIF(left(btrim(item.value->>'unit'), 80), ''),
    NULLIF(item.value->>'unit_price', '')::numeric(14,4),
    NULLIF(item.value->>'tax_rate', '')::numeric(6,3),
    NULLIF(item.value->>'line_total', '')::numeric(14,2),
    true,
    now(),
    left(p_actor_email, 320)
  FROM jsonb_array_elements(p_items) AS item(value);

  UPDATE public.documentos
  SET
    invoice_items_human_verified = true,
    updated_by_email = left(p_actor_email, 320),
    updated_at = now()
  WHERE id = p_document_id;

  SELECT COALESCE(jsonb_agg(to_jsonb(i) ORDER BY i.created_at, i.id), '[]'::jsonb)
  INTO v_after
  FROM public.invoice_items i
  WHERE i.document_id = p_document_id;

  INSERT INTO public.document_audit_log (
    document_id,
    action,
    before_data,
    after_data,
    actor_email
  )
  VALUES (
    p_document_id,
    'invoice_items_replaced',
    jsonb_build_object('items', v_before),
    jsonb_build_object('items', v_after, 'human_verified', true),
    left(p_actor_email, 320)
  );

  RETURN QUERY
  SELECT i.*
  FROM public.invoice_items i
  WHERE i.document_id = p_document_id
  ORDER BY i.created_at, i.id;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_document_batch(uuid[], text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.replace_document_invoice_items(uuid, jsonb, text)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.confirm_document_batch(uuid[], text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.replace_document_invoice_items(uuid, jsonb, text)
  TO service_role;

COMMENT ON COLUMN public.documentos.invoice_items_human_verified IS
  'Prevents AI reprocessing from replacing invoice lines confirmed by a human.';
COMMENT ON FUNCTION public.confirm_document_batch(uuid[], text) IS
  'Atomically confirms up to 50 documents and records one audit entry per document.';
COMMENT ON FUNCTION public.replace_document_invoice_items(uuid, jsonb, text) IS
  'Atomically replaces invoice lines, locks them against AI overwrite, and records the complete change.';
