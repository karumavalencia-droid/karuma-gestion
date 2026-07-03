-- Lista de espera compartida (público + staff), estilo CoverManager.
-- El público se apunta desde /reservas cuando no hay disponibilidad;
-- el staff la gestiona desde /dashboard/reservas.

CREATE TABLE IF NOT EXISTS lista_espera (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha      DATE NOT NULL,
  servicio   TEXT NOT NULL CHECK (servicio IN ('comida', 'cena')),
  nombre     TEXT NOT NULL,
  telefono   TEXT NOT NULL,
  personas   INTEGER NOT NULL CHECK (personas BETWEEN 1 AND 20),
  notas      TEXT,
  origen     TEXT NOT NULL DEFAULT 'staff' CHECK (origen IN ('online', 'staff')),
  estado     TEXT NOT NULL DEFAULT 'esperando' CHECK (estado IN ('esperando', 'sentado', 'cancelado')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lista_espera_fecha ON lista_espera (fecha, estado);

-- Solo el service role (API) puede leer/escribir; sin políticas para anon.
ALTER TABLE lista_espera ENABLE ROW LEVEL SECURITY;
