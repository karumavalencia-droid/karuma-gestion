-- ============================================================================
-- 026_sales.sql — Ventas diarias unificadas (MVP "Resumen diario de ventas")
-- ----------------------------------------------------------------------------
-- Unifica las tres fuentes previas de ventas (CSV -> localStorage, cron/webhook
-- -> Vercel Blob JSON) en una única tabla Supabase: sales_daily.
--
-- Modelo de seguridad del proyecto:
--   - La app NO usa Supabase Auth para su sesión: usa una cookie propia firmada
--     (HMAC) `karuma_session` verificada en el servidor (lib/auth/session.ts).
--   - Todas las escrituras pasan por rutas API Next.js que usan la SERVICE ROLE
--     key (getSupabaseAdmin), que ignora RLS.
--   - RLS aquí es defensa en profundidad: se habilita y NO se crea ninguna
--     política de escritura para anon/authenticated, de modo que la anon key
--     pública no puede leer ni escribir ventas. Solo la service role (servidor)
--     puede tocar estas tablas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. sales_daily — un registro por (location_id, business_date)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_daily (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id    text NOT NULL,
  business_date  date NOT NULL,
  gross_sales    numeric(12,2),
  net_sales      numeric(12,2) NOT NULL DEFAULT 0,
  customers      integer,
  orders         integer,
  average_ticket numeric(12,2),
  drink_sales    numeric(12,2),
  delivery_sales numeric(12,2),
  cash_sales     numeric(12,2),
  card_sales     numeric(12,2),
  source         text NOT NULL DEFAULT 'csv',
  external_id    text,
  notes          text,
  synced_at      timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sales_daily_location_date_unique UNIQUE (location_id, business_date)
);

CREATE INDEX IF NOT EXISTS idx_sales_daily_business_date
  ON sales_daily (business_date);
CREATE INDEX IF NOT EXISTS idx_sales_daily_location_date
  ON sales_daily (location_id, business_date);

-- ----------------------------------------------------------------------------
-- 2. sales_import_log — auditoría de cada importación (sin contenido del CSV)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sales_import_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source        text NOT NULL,
  file_name     text,
  total_rows    integer NOT NULL DEFAULT 0,
  inserted_rows integer NOT NULL DEFAULT 0,
  updated_rows  integer NOT NULL DEFAULT 0,
  skipped_rows  integer NOT NULL DEFAULT 0,
  status        text NOT NULL,           -- 'success' | 'partial' | 'error'
  error_message text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sales_import_log_created_at
  ON sales_import_log (created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. Trigger para mantener updated_at en sales_daily
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_sales_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sales_daily_updated_at ON sales_daily;
CREATE TRIGGER trg_sales_daily_updated_at
  BEFORE UPDATE ON sales_daily
  FOR EACH ROW
  EXECUTE FUNCTION set_sales_updated_at();

-- ----------------------------------------------------------------------------
-- 4. RLS — habilitado y SIN políticas. La app no usa Supabase Auth (sesión
--    propia por cookie firmada), así que ningún cliente anon/authenticated
--    debe leer ni escribir estas tablas. Con RLS habilitada y cero políticas,
--    la anon key queda bloqueada por completo; la service role (solo en el
--    servidor Next.js) ignora RLS y realiza las lecturas y upserts.
--    Nota: NO se referencian app_users/auth.uid() a propósito — la tabla
--    app_users (migración 022) puede no existir en esta base de datos y las
--    políticas basadas en Supabase Auth no aplican a este modelo de sesión.
-- ----------------------------------------------------------------------------
ALTER TABLE sales_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_import_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Sales daily visible to admin" ON sales_daily;
DROP POLICY IF EXISTS "Sales import log visible to admin" ON sales_import_log;

COMMENT ON TABLE sales_daily IS
  'Resumen diario de ventas unificado. Escritura solo vía API servidor (service role). Upsert por (location_id, business_date).';
COMMENT ON TABLE sales_import_log IS
  'Auditoría de importaciones de ventas. No almacena el contenido del CSV, solo métricas del resultado.';
