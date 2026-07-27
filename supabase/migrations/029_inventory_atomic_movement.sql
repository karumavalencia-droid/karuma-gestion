-- Atomic inventory movement: lock item, validate balance, update snapshot,
-- and append immutable movement in one transaction.

CREATE OR REPLACE FUNCTION public.apply_inventory_movement(
  p_item_id UUID,
  p_movement_type TEXT,
  p_quantity NUMERIC,
  p_note TEXT DEFAULT ''
)
RETURNS inventory_items
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  item inventory_items;
  next_quantity NUMERIC;
BEGIN
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RAISE EXCEPTION 'quantity must be greater than zero';
  END IF;

  IF p_movement_type NOT IN ('entrada', 'salida', 'ajuste') THEN
    RAISE EXCEPTION 'invalid movement type';
  END IF;

  SELECT * INTO item
  FROM inventory_items
  WHERE id = p_item_id AND active = true
  FOR UPDATE;

  IF NOT FOUND THEN RAISE EXCEPTION 'inventory item not found'; END IF;

  next_quantity := CASE
    WHEN p_movement_type = 'entrada' THEN item.current_quantity + p_quantity
    WHEN p_movement_type = 'salida' THEN item.current_quantity - p_quantity
    ELSE p_quantity
  END;

  IF next_quantity < 0 THEN RAISE EXCEPTION 'insufficient inventory'; END IF;

  UPDATE inventory_items
  SET current_quantity = next_quantity, updated_at = NOW()
  WHERE id = p_item_id
  RETURNING * INTO item;

  INSERT INTO inventory_movements (item_id, movement_type, quantity, note, created_by)
  VALUES (p_item_id, p_movement_type, p_quantity, COALESCE(p_note, ''), auth.uid());

  RETURN item;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.apply_inventory_movement(UUID, TEXT, NUMERIC, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.apply_inventory_movement(UUID, TEXT, NUMERIC, TEXT) TO authenticated;
