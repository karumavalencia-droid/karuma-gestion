-- Capacidades reales de las mesas 19 y 20 (estaban intercambiadas respecto
-- al plano local del dashboard): la 19 es de 2 plazas y la 20 de 4.

UPDATE mesas SET capacidad = 2 WHERE numero = 19;
UPDATE mesas SET capacidad = 4 WHERE numero = 20;
