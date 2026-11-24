-- Reservas online de 1 a 12 personas (antes 1–6 en la web). De 7 a 12 se sientan en 2, 3 o 4
-- mesas contiguas (p. ej. T17–T20) con la lógica de combinaciones que ya tenía la función.
-- Aplicada en producción el 24/11/2026.
DO $$
DECLARE d TEXT;
BEGIN
  SELECT pg_get_functiondef('create_online_reservation_atomic(uuid,date,time,text,integer,integer,text)'::regprocedure) INTO d;
  -- En producción la función ya admitía 1–10 y cadenas de 4 mesas; solo se sube el tope.
  IF position('BETWEEN 1 AND 10' IN d) = 0 THEN
    RAISE EXCEPTION 'No se encontró el límite de 10 personas en la función';
  END IF;
  EXECUTE replace(d, 'BETWEEN 1 AND 10', 'BETWEEN 1 AND 12');
END $$;

ALTER TABLE reservas_config DROP CONSTRAINT IF EXISTS reservas_config_max_personas_online_check;
ALTER TABLE reservas_config ALTER COLUMN max_personas_online SET DEFAULT 12;
UPDATE reservas_config SET max_personas_online = 12 WHERE id = 1;
ALTER TABLE reservas_config ADD CONSTRAINT reservas_config_max_personas_online_check CHECK (max_personas_online BETWEEN 1 AND 12);
