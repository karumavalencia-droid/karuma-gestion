-- This legacy aggregate is not used directly by the browser application.
-- Keep it server-only so public Supabase keys cannot read or mutate sales data.
ALTER TABLE public.product_sales_summary ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.product_sales_summary FROM anon, authenticated;
GRANT ALL ON TABLE public.product_sales_summary TO service_role;

COMMENT ON TABLE public.product_sales_summary IS
  'Aggregated product sales snapshots imported from TPV reports. Server-only access through service_role.';
