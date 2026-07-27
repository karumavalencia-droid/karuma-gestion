-- Online reservations are limited to 1–6 guests and table combinations must
-- use explicit, mutual adjacency. The RPC serializes allocation per date so
-- two concurrent requests cannot reserve any table in the same combination.

ALTER TABLE mesas
  ADD COLUMN IF NOT EXISTS adjacent_mesa_ids INTEGER[] NOT NULL DEFAULT '{}';

-- Physical connected rows already used by the restaurant floor plan. Only
-- consecutive tables inside a row are adjacent; separate rows never combine.
WITH adjacency(numero, adjacent_numbers) AS (
  VALUES
    (1, ARRAY[2]), (2, ARRAY[1,3]), (3, ARRAY[2,4]),
    (4, ARRAY[3,5]), (5, ARRAY[4,6]), (6, ARRAY[5,7]), (7, ARRAY[6]),
    (8, ARRAY[9]), (9, ARRAY[8,10]), (10, ARRAY[9,11]), (11, ARRAY[10]),
    (12, ARRAY[13]), (13, ARRAY[12]),
    (17, ARRAY[18]), (18, ARRAY[17,19]), (19, ARRAY[18,20]), (20, ARRAY[19])
)
UPDATE mesas m
SET combinable = true,
    adjacent_mesa_ids = ARRAY(
      SELECT neighbor.id
      FROM mesas neighbor
      WHERE neighbor.numero = ANY(adjacency.adjacent_numbers)
    )
FROM adjacency
WHERE m.numero = adjacency.numero;

ALTER TABLE reservas_config
  ADD COLUMN IF NOT EXISTS turno_gap_min INTEGER NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS duracion_5_6_min INTEGER NOT NULL DEFAULT 150;

ALTER TABLE reservas_config
  ALTER COLUMN max_personas_online SET DEFAULT 6;

UPDATE reservas_config
SET max_personas_online = 6
WHERE id = 1;

ALTER TABLE reservas_config
  DROP CONSTRAINT IF EXISTS reservas_config_max_personas_online_check;

ALTER TABLE reservas_config
  ADD CONSTRAINT reservas_config_max_personas_online_check
  CHECK (max_personas_online = 6);

CREATE OR REPLACE FUNCTION create_online_reservation_atomic(
  p_cliente_id UUID,
  p_fecha DATE,
  p_hora_inicio TIME,
  p_servicio TEXT,
  p_personas INTEGER,
  p_duracion_min INTEGER,
  p_notas TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_config reservas_config%ROWTYPE;
  v_mesa_ids INTEGER[];
  v_reserva_id UUID;
  v_total_capacidad INTEGER;
  v_personas_online INTEGER;
BEGIN
  IF p_personas NOT BETWEEN 1 AND 6 THEN
    RAISE EXCEPTION 'ONLINE_PARTY_SIZE_OUT_OF_RANGE' USING ERRCODE = '22023';
  END IF;
  IF p_servicio NOT IN ('comida', 'cena') THEN
    RAISE EXCEPTION 'INVALID_SERVICE' USING ERRCODE = '22023';
  END IF;

  -- Serialize every allocation for the same service date. This lock lasts for
  -- the transaction that selects the complete combination and inserts it.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_fecha::TEXT, 0));

  SELECT * INTO v_config
  FROM reservas_config
  WHERE id = 1;

  IF NOT FOUND OR NOT v_config.reservas_online_activas THEN
    RAISE EXCEPTION 'ONLINE_RESERVATIONS_DISABLED' USING ERRCODE = 'P0001';
  END IF;
  IF p_personas > v_config.max_personas_online THEN
    RAISE EXCEPTION 'ONLINE_PARTY_SIZE_OUT_OF_RANGE' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(SUM(capacidad), 0)
  INTO v_total_capacidad
  FROM mesas
  WHERE activa;

  SELECT COALESCE(SUM(r.personas), 0)
  INTO v_personas_online
  FROM reservas r
  WHERE r.fecha = p_fecha
    AND r.origen = 'online'
    AND r.estado IN ('Confirmada', 'Sentado', 'WalkIn')
    AND p_hora_inicio < r.hora_inicio
      + make_interval(mins => r.duracion_min + COALESCE(v_config.turno_gap_min, 30))
    AND r.hora_inicio < p_hora_inicio
      + make_interval(mins => p_duracion_min + COALESCE(v_config.turno_gap_min, 30));

  IF v_personas_online + p_personas >
    FLOOR(v_total_capacidad * v_config.capacidad_online_pct / 100.0) THEN
    RAISE EXCEPTION 'NO_TABLE_AVAILABILITY' USING ERRCODE = 'P0001';
  END IF;

  -- Prefer the smallest suitable single table.
  SELECT ARRAY[m.id]
  INTO v_mesa_ids
  FROM mesas m
  WHERE m.activa
    AND m.capacidad >= p_personas
    AND (p_personas > 2 OR m.capacidad = 2)
    AND NOT EXISTS (
      SELECT 1
      FROM reservas r
      WHERE r.fecha = p_fecha
        AND r.estado IN ('Confirmada', 'Sentado', 'WalkIn')
        AND r.mesa_ids && ARRAY[m.id]
        AND p_hora_inicio < r.hora_inicio
          + make_interval(mins => r.duracion_min + COALESCE(v_config.turno_gap_min, 30))
        AND r.hora_inicio < p_hora_inicio
          + make_interval(mins => p_duracion_min + COALESCE(v_config.turno_gap_min, 30))
    )
  ORDER BY m.capacidad, m.numero
  LIMIT 1;

  -- Then try an adjacent pair (4+2, 2+2, etc.).
  IF v_mesa_ids IS NULL AND p_personas >= 5 THEN
    SELECT ARRAY[a.id, b.id]
    INTO v_mesa_ids
    FROM mesas a
    JOIN mesas b ON b.id > a.id
      AND b.id = ANY(a.adjacent_mesa_ids)
      AND a.id = ANY(b.adjacent_mesa_ids)
    WHERE a.activa AND b.activa
      AND a.combinable AND b.combinable
      AND a.capacidad + b.capacidad >= p_personas
      AND NOT EXISTS (
        SELECT 1 FROM reservas r
        WHERE r.fecha = p_fecha
          AND r.estado IN ('Confirmada', 'Sentado', 'WalkIn')
          AND r.mesa_ids && ARRAY[a.id, b.id]
          AND p_hora_inicio < r.hora_inicio
            + make_interval(mins => r.duracion_min + COALESCE(v_config.turno_gap_min, 30))
          AND r.hora_inicio < p_hora_inicio
            + make_interval(mins => p_duracion_min + COALESCE(v_config.turno_gap_min, 30))
      )
    ORDER BY a.capacidad + b.capacidad, a.numero, b.numero
    LIMIT 1;
  END IF;

  -- Finally try three connected tables (a chain is valid; scattered tables are not).
  IF v_mesa_ids IS NULL AND p_personas >= 5 THEN
    SELECT ARRAY[a.id, b.id, c.id]
    INTO v_mesa_ids
    FROM mesas a
    JOIN mesas b ON b.id > a.id
    JOIN mesas c ON c.id > b.id
    WHERE a.activa AND b.activa AND c.activa
      AND a.combinable AND b.combinable AND c.combinable
      AND (
        (
          b.id = ANY(a.adjacent_mesa_ids) AND a.id = ANY(b.adjacent_mesa_ids)
          AND c.id = ANY(a.adjacent_mesa_ids) AND a.id = ANY(c.adjacent_mesa_ids)
        )
        OR (
          b.id = ANY(a.adjacent_mesa_ids) AND a.id = ANY(b.adjacent_mesa_ids)
          AND c.id = ANY(b.adjacent_mesa_ids) AND b.id = ANY(c.adjacent_mesa_ids)
        )
        OR (
          c.id = ANY(a.adjacent_mesa_ids) AND a.id = ANY(c.adjacent_mesa_ids)
          AND c.id = ANY(b.adjacent_mesa_ids) AND b.id = ANY(c.adjacent_mesa_ids)
        )
      )
      AND a.capacidad + b.capacidad + c.capacidad >= p_personas
      AND NOT EXISTS (
        SELECT 1 FROM reservas r
        WHERE r.fecha = p_fecha
          AND r.estado IN ('Confirmada', 'Sentado', 'WalkIn')
          AND r.mesa_ids && ARRAY[a.id, b.id, c.id]
          AND p_hora_inicio < r.hora_inicio
            + make_interval(mins => r.duracion_min + COALESCE(v_config.turno_gap_min, 30))
          AND r.hora_inicio < p_hora_inicio
            + make_interval(mins => p_duracion_min + COALESCE(v_config.turno_gap_min, 30))
      )
    ORDER BY a.capacidad + b.capacidad + c.capacidad, a.numero, b.numero, c.numero
    LIMIT 1;
  END IF;

  IF v_mesa_ids IS NULL THEN
    RAISE EXCEPTION 'NO_TABLE_AVAILABILITY' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO reservas (
    cliente_id, fecha, hora_inicio, duracion_min, servicio, personas,
    mesa_ids, estado, notas, origen
  )
  VALUES (
    p_cliente_id, p_fecha, p_hora_inicio, p_duracion_min, p_servicio,
    p_personas, v_mesa_ids, 'Confirmada', p_notas, 'online'
  )
  RETURNING id INTO v_reserva_id;

  RETURN jsonb_build_object('reservation_id', v_reserva_id, 'mesa_ids', v_mesa_ids);
END;
$$;

REVOKE ALL ON FUNCTION create_online_reservation_atomic(UUID, DATE, TIME, TEXT, INTEGER, INTEGER, TEXT)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION create_online_reservation_atomic(UUID, DATE, TIME, TEXT, INTEGER, INTEGER, TEXT)
TO service_role;
