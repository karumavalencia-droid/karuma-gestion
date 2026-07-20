-- Harden internal trigger functions created by migration 037.
ALTER FUNCTION public.set_operational_alerts_updated_at()
  SET search_path = public;

ALTER FUNCTION public.detect_inventory_stock_exception()
  SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.set_operational_alerts_updated_at()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.detect_inventory_stock_exception()
  FROM PUBLIC, anon, authenticated;
