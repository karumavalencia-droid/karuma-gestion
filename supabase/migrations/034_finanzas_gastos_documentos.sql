-- ============================================================================
-- 034: Finanzas privadas (gastos) + archivo de documentos confidenciales
--
-- Ambas tablas son SOLO para el owner: RLS activado sin policies, de modo que
-- únicamente el service role (backend) puede leer/escribir. El backend
-- comprueba rol owner en cada endpoint (lib/auth/owner-guard.ts).
--
-- Aplicar manualmente en el SQL Editor del dashboard de Supabase.
-- ============================================================================

-- 1. gastos — un registro por gasto (alquiler, nómina, suministro, etc.)
CREATE TABLE IF NOT EXISTS gastos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha       date NOT NULL,
  categoria   text NOT NULL CHECK (categoria IN (
    'alquiler', 'personal', 'seguros_sociales', 'proveedores',
    'suministros', 'impuestos', 'marketing', 'comisiones', 'otros'
  )),
  concepto    text NOT NULL,
  importe     numeric(12,2) NOT NULL CHECK (importe >= 0),
  empresa     text NOT NULL DEFAULT 'kosushi' CHECK (empresa IN ('kosushi', 'spicy')),
  fuente      text NOT NULL DEFAULT 'manual',  -- manual | csv | factura
  notas       text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos (fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON gastos (categoria);

ALTER TABLE gastos ENABLE ROW LEVEL SECURITY;

-- 2. documentos — metadata de archivos confidenciales (bucket privado "documentos")
CREATE TABLE IF NOT EXISTS documentos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       text NOT NULL,
  categoria    text NOT NULL DEFAULT 'otros' CHECK (categoria IN (
    'bancos', 'contratos', 'nominas', 'impuestos', 'seguros', 'licencias', 'otros'
  )),
  storage_path text NOT NULL UNIQUE,
  mime_type    text,
  tamano_bytes bigint,
  notas        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documentos_categoria ON documentos (categoria);

ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;
