-- Último pase de comida a las 15:30; cena desde las 19:00.
-- Los campos *_fin son últimos horarios de reserva, no la hora de cierre.
UPDATE public.horario_semanal
SET comida_inicio = '13:00', comida_fin = '15:30',
    cena_inicio = '19:00', cena_fin = '22:00'
WHERE dia BETWEEN 0 AND 6;

UPDATE public.reservas_config
SET comida_inicio = '13:00', comida_fin = '15:30',
    cena_inicio = '19:00', cena_fin = '22:00'
WHERE id = 1;
