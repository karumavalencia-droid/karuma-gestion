-- La mesa 21 no existe en el restaurante: se desactiva en vez de borrarla
-- para conservar las reservas históricas que puedan referenciarla.

UPDATE mesas SET activa = false WHERE numero = 21;
