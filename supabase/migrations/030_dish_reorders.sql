-- Anonymous daily aggregates for dishes ordered again later on the same bill.
-- POS order IDs are used transiently during calculation and are never stored.
CREATE TABLE IF NOT EXISTS dish_reorder_daily (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id         text NOT NULL,
  business_date       date NOT NULL,
  item_id              text NOT NULL,
  item_name            text NOT NULL,
  category             text,
  orders_with_item     integer NOT NULL DEFAULT 0 CHECK (orders_with_item >= 0),
  reordered_orders     integer NOT NULL DEFAULT 0 CHECK (reordered_orders >= 0),
  reorder_events       integer NOT NULL DEFAULT 0 CHECK (reorder_events >= 0),
  total_qty            numeric(12,2) NOT NULL DEFAULT 0 CHECK (total_qty >= 0),
  reorder_qty          numeric(12,2) NOT NULL DEFAULT 0 CHECK (reorder_qty >= 0),
  gap_minutes_sum      numeric(14,2) NOT NULL DEFAULT 0 CHECK (gap_minutes_sum >= 0),
  gap_samples          integer NOT NULL DEFAULT 0 CHECK (gap_samples >= 0),
  covered_orders       integer NOT NULL DEFAULT 0 CHECK (covered_orders >= 0),
  kds_rows             integer NOT NULL DEFAULT 0 CHECK (kds_rows >= 0),
  source               text NOT NULL DEFAULT 'restosuite-kds-report',
  synced_at            timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dish_reorder_daily_unique
    UNIQUE (location_id, business_date, item_id),
  CONSTRAINT dish_reorder_daily_reordered_lte_orders
    CHECK (reordered_orders <= orders_with_item),
  CONSTRAINT dish_reorder_daily_reorder_qty_lte_total
    CHECK (reorder_qty <= total_qty)
);

CREATE INDEX IF NOT EXISTS idx_dish_reorder_daily_location_date
  ON dish_reorder_daily (location_id, business_date);
CREATE INDEX IF NOT EXISTS idx_dish_reorder_daily_rank
  ON dish_reorder_daily (business_date, reordered_orders DESC);

DROP TRIGGER IF EXISTS trg_dish_reorder_daily_updated_at
  ON dish_reorder_daily;
CREATE TRIGGER trg_dish_reorder_daily_updated_at
  BEFORE UPDATE ON dish_reorder_daily
  FOR EACH ROW
  EXECUTE FUNCTION set_sales_updated_at();

ALTER TABLE dish_reorder_daily ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE dish_reorder_daily FROM anon, authenticated;
GRANT ALL ON TABLE dish_reorder_daily TO service_role;

COMMENT ON TABLE dish_reorder_daily IS
  'Anonymous daily KDS aggregates for dishes ordered again later on the same bill. No bill, table, customer, or credential data is stored.';
