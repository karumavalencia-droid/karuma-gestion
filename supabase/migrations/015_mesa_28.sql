-- La mesa 28 vuelve a estar operativa: alta en Supabase para que la
-- disponibilidad online (/api/reservas/*) también pueda asignarla.
-- 2 plazas, Interior, no combinable (como las demás mesas de 2 del interior).

INSERT INTO mesas (numero, capacidad, zona, combinable, activa)
VALUES (28, 2, 'Interior', false, true)
ON CONFLICT (numero) DO UPDATE
  SET capacidad = 2, zona = 'Interior', activa = true;
