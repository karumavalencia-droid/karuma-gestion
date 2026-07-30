-- ─────────────────────────────────────────────────────────────────────────────
-- 029 · Tablas financieras privadas del propietario
-- bank_transactions, payroll_records, rent_expenses, private_expenses
--
-- Todas con RLS activada y policies que exigen owner + aal2 (is_owner_aal2()).
-- Ningún authenticated/manager/employee normal puede leerlas ni escribirlas.
-- Las UPDATE llevan USING y WITH CHECK. Nunca se usa user_metadata.
-- El servidor escribe con service role (ignora RLS); estas policies son la
-- defensa en profundidad frente a cualquier acceso con clave anon/authenticated.
--
-- Idempotente. No inserta datos reales.
-- ─────────────────────────────────────────────────────────────────────────────

-- Aplica las 4 policies estándar (owner+aal2) a una tabla dada.
-- search_path bloqueado (evita el aviso function_search_path_mutable del advisor).
-- El gate se envuelve en (SELECT ...) para que el planner lo evalúe una vez por
-- consulta (evita el aviso auth_rls_initplan).
CREATE OR REPLACE FUNCTION public._apply_owner_aal2_policies(tbl regclass)
RETURNS void
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  name text := (SELECT relname FROM pg_class WHERE oid = tbl);
  gate text := '(SELECT public.is_owner_aal2())';
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY', tbl);
  EXECUTE format('ALTER TABLE %s FORCE ROW LEVEL SECURITY', tbl);

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', name || '_sel', tbl);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR SELECT TO authenticated USING (%s)',
    name || '_sel', tbl, gate);

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', name || '_ins', tbl);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR INSERT TO authenticated WITH CHECK (%s)',
    name || '_ins', tbl, gate);

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', name || '_upd', tbl);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR UPDATE TO authenticated USING (%s) WITH CHECK (%s)',
    name || '_upd', tbl, gate, gate);

  EXECUTE format('DROP POLICY IF EXISTS %I ON %s', name || '_del', tbl);
  EXECUTE format(
    'CREATE POLICY %I ON %s FOR DELETE TO authenticated USING (%s)',
    name || '_del', tbl, gate);
END;
$$;

-- ── Movimientos bancarios ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bank_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booked_on DATE NOT NULL,
  concept TEXT NOT NULL,
  counterparty TEXT,
  -- Solo se guardan los últimos 4 dígitos de la cuenta; nunca el IBAN completo.
  account_last4 TEXT CHECK (account_last4 IS NULL OR account_last4 ~ '^[0-9]{4}$'),
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  notes TEXT,
  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public._apply_owner_aal2_policies('public.bank_transactions');

-- ── Nóminas ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payroll_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL,                    -- 'YYYY-MM'
  employee_label TEXT NOT NULL,            -- etiqueta, no datos personales sensibles
  gross_cents BIGINT NOT NULL,
  net_cents BIGINT NOT NULL,
  cost_cents BIGINT,                       -- coste empresa
  currency TEXT NOT NULL DEFAULT 'EUR',
  notes TEXT,
  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public._apply_owner_aal2_policies('public.payroll_records');

-- ── Alquiler ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rent_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period TEXT NOT NULL,                    -- 'YYYY-MM'
  concept TEXT NOT NULL DEFAULT 'Alquiler local',
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  paid_on DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public._apply_owner_aal2_policies('public.rent_expenses');

-- ── Gastos privados varios ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.private_expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  spent_on DATE NOT NULL,
  category TEXT NOT NULL,
  concept TEXT NOT NULL,
  amount_cents BIGINT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  notes TEXT,
  created_by UUID REFERENCES auth.users (id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
SELECT public._apply_owner_aal2_policies('public.private_expenses');

CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON public.bank_transactions (booked_on DESC);
CREATE INDEX IF NOT EXISTS idx_payroll_records_period ON public.payroll_records (period DESC);
CREATE INDEX IF NOT EXISTS idx_rent_expenses_period ON public.rent_expenses (period DESC);
CREATE INDEX IF NOT EXISTS idx_private_expenses_date ON public.private_expenses (spent_on DESC);
