-- Minimum cleaning/turnover gap between two reservations on the same table.

ALTER TABLE reservas_config
  ADD COLUMN IF NOT EXISTS turno_gap_min INTEGER DEFAULT 30;

UPDATE reservas_config
SET turno_gap_min = 30
WHERE id = 1 AND turno_gap_min IS NULL;

ALTER TABLE reservas_config
  ALTER COLUMN turno_gap_min SET DEFAULT 30,
  ALTER COLUMN turno_gap_min SET NOT NULL;
