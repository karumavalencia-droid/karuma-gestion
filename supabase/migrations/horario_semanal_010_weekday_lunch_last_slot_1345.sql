-- Allow weekday lunch online bookings through the 13:45 last seating.
UPDATE horario_semanal
SET comida_fin = '13:45'
WHERE dia BETWEEN 1 AND 5
  AND comida_activa = true
  AND comida_inicio = '13:00'
  AND comida_fin = '13:30';
