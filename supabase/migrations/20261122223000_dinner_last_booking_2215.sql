-- Extend the final dinner reservation slot by 15 minutes.
UPDATE horario_semanal
SET cena_fin = '22:15'
WHERE cena_activa = true
  AND cena_fin = '22:00';

UPDATE reservas_config
SET cena_fin = '22:15'
WHERE cena_fin = '22:00';
