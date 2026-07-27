-- Momento real en que el cliente se sienta.
-- No usar created_at: una reserva puede haberse creado días antes de la visita.
ALTER TABLE reservas
  ADD COLUMN IF NOT EXISTS seated_at TIMESTAMPTZ;

-- Para reservas que ya estaban sentadas al desplegar esta migración,
-- updated_at es la mejor aproximación disponible al último cambio de estado.
UPDATE reservas
SET seated_at = updated_at
WHERE estado IN ('Sentado', 'WalkIn')
  AND seated_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_reservas_seated_at
  ON reservas (seated_at)
  WHERE seated_at IS NOT NULL;
