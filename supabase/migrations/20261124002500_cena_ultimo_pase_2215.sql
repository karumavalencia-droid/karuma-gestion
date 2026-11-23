-- Último pase de cena a las 22:15 todos los días (antes 21:45 por día y 22:00 global). Comida sin cambios.
-- Aplicada en producción el 24/11/2026.
UPDATE public.horario_semanal SET cena_fin = '22:15' WHERE dia BETWEEN 0 AND 6;
UPDATE public.reservas_config SET cena_fin = '22:15' WHERE id = 1;
