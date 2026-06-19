-- Módulo de Reservas — Karuma ERP
-- Tablas: mesas, clientes_reservas, reservas, reservas_config, cierres_servicio
-- RLS: abierto para desarrollo. TODO: endurecer antes de producción.

-- ── 1. MESAS ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mesas (
  id          SERIAL PRIMARY KEY,
  numero      INTEGER NOT NULL UNIQUE,
  capacidad   INTEGER NOT NULL DEFAULT 4,
  zona        TEXT,
  combinable  BOOLEAN NOT NULL DEFAULT false,
  activa      BOOLEAN NOT NULL DEFAULT true,
  pos_x       INTEGER,
  pos_y       INTEGER,
  ancho       INTEGER,
  alto        INTEGER,
  forma       TEXT DEFAULT 'rect'
);

INSERT INTO mesas (numero, capacidad, zona, combinable) VALUES
  (1,  2, 'Interior', false),
  (2,  2, 'Interior', false),
  (3,  2, 'Interior', false),
  (4,  2, 'Interior', false),
  (5,  4, 'Interior', true),
  (6,  4, 'Interior', true),
  (7,  4, 'Interior', true),
  (8,  4, 'Interior', true),
  (9,  4, 'Interior', true),
  (10, 4, 'Interior', true),
  (11, 4, 'Interior', true),
  (12, 4, 'Interior', true),
  (13, 4, 'Terraza',  true),
  (14, 4, 'Terraza',  true),
  (15, 4, 'Terraza',  true),
  (16, 4, 'Terraza',  true),
  (17, 6, 'Privado',  true),
  (18, 6, 'Privado',  true),
  (19, 6, 'Privado',  true),
  (20, 8, 'Privado',  true),
  (21, 8, 'Privado',  true)
ON CONFLICT (numero) DO NOTHING;

-- ── 2. CLIENTES_RESERVAS ────────────────────────────────────────────────────
-- Tabla propia para reservas (no mezclar con users del ERP)

CREATE TABLE IF NOT EXISTS clientes_reservas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre       TEXT NOT NULL,
  telefono     TEXT NOT NULL UNIQUE,
  email        TEXT,
  visitas      INTEGER NOT NULL DEFAULT 0,
  no_shows     INTEGER NOT NULL DEFAULT 0,
  vip          BOOLEAN NOT NULL DEFAULT false,
  bloqueado    BOOLEAN NOT NULL DEFAULT false,
  notas        TEXT,
  ultima_visita DATE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_clientes_reservas_telefono ON clientes_reservas (telefono);

-- ── 3. RESERVAS ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reservas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id   UUID REFERENCES clientes_reservas (id) ON DELETE SET NULL,
  fecha        DATE NOT NULL,
  hora_inicio  TIME NOT NULL,
  duracion_min INTEGER NOT NULL DEFAULT 90,
  servicio     TEXT NOT NULL CHECK (servicio IN ('comida', 'cena')),
  personas     INTEGER NOT NULL,
  mesa_ids     INTEGER[] NOT NULL DEFAULT '{}',
  estado       TEXT NOT NULL DEFAULT 'Confirmada'
               CHECK (estado IN ('Confirmada', 'Sentado', 'Finalizada', 'Cancelada', 'NoShow', 'WalkIn')),
  notas        TEXT,
  origen       TEXT NOT NULL DEFAULT 'online' CHECK (origen IN ('online', 'telefono', 'walkin', 'manual')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reservas_fecha ON reservas (fecha);
CREATE INDEX IF NOT EXISTS idx_reservas_cliente ON reservas (cliente_id);

CREATE OR REPLACE FUNCTION set_reservas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS reservas_updated_at ON reservas;
CREATE TRIGGER reservas_updated_at
  BEFORE UPDATE ON reservas
  FOR EACH ROW EXECUTE FUNCTION set_reservas_updated_at();

DROP TRIGGER IF EXISTS clientes_reservas_updated_at ON clientes_reservas;
CREATE TRIGGER clientes_reservas_updated_at
  BEFORE UPDATE ON clientes_reservas
  FOR EACH ROW EXECUTE FUNCTION set_reservas_updated_at();

-- ── 4. CONFIGURACIÓN ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS reservas_config (
  id                      INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  reservas_online_activas BOOLEAN NOT NULL DEFAULT true,
  max_personas_online     INTEGER NOT NULL DEFAULT 4,
  intervalo_min           INTEGER NOT NULL DEFAULT 15,
  duracion_1_2_min        INTEGER NOT NULL DEFAULT 90,
  duracion_3_4_min        INTEGER NOT NULL DEFAULT 120,
  dias_max_antelacion     INTEGER NOT NULL DEFAULT 30,
  capacidad_online_pct    INTEGER NOT NULL DEFAULT 70,
  comida_inicio           TIME NOT NULL DEFAULT '13:00',
  comida_fin              TIME NOT NULL DEFAULT '15:00',
  cena_inicio             TIME NOT NULL DEFAULT '20:00',
  cena_fin                TIME NOT NULL DEFAULT '22:00',
  telefono                TEXT DEFAULT '+34 963 000 000',
  whatsapp                TEXT DEFAULT '+34 600 000 000',
  google_review_link      TEXT
);

INSERT INTO reservas_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- ── 5. CIERRES DE SERVICIO ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cierres_servicio (
  id        SERIAL PRIMARY KEY,
  fecha     DATE NOT NULL,
  servicio  TEXT CHECK (servicio IN ('comida', 'cena', 'todo')),
  motivo    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (fecha, servicio)
);

-- ── RLS: TODO endurecer antes de producción ─────────────────────────────────
-- La página pública /reservas solo debe poder INSERT en reservas y clientes_reservas,
-- y leer disponibilidad. No debe leer la base de clientes completa.
-- Las páginas de gestión requieren auth de personal.
ALTER TABLE mesas              ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes_reservas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas           ENABLE ROW LEVEL SECURITY;
ALTER TABLE reservas_config    ENABLE ROW LEVEL SECURITY;
ALTER TABLE cierres_servicio   ENABLE ROW LEVEL SECURITY;

-- Políticas abiertas temporales (desarrollo)
CREATE POLICY "dev_open_mesas"             ON mesas             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_open_clientes_reservas" ON clientes_reservas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_open_reservas"          ON reservas          FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_open_config"            ON reservas_config   FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "dev_open_cierres"           ON cierres_servicio  FOR ALL USING (true) WITH CHECK (true);
