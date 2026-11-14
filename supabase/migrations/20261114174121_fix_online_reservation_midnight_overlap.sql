-- Include the service date so reservations ending after midnight still block their tables.
CREATE OR REPLACE FUNCTION public.create_online_reservation_atomic(p_cliente_id uuid, p_fecha date, p_hora_inicio time without time zone, p_servicio text, p_personas integer, p_duracion_min integer, p_notas text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_config reservas_config%ROWTYPE;
  v_mesa_ids INTEGER[];
  v_reserva_id UUID;
  v_total_capacidad INTEGER;
  v_personas_online INTEGER;
BEGIN
  IF p_personas NOT BETWEEN 1 AND 10 THEN
    RAISE EXCEPTION 'ONLINE_PARTY_SIZE_OUT_OF_RANGE' USING ERRCODE = '22023';
  END IF;
  IF p_servicio NOT IN ('comida', 'cena') THEN
    RAISE EXCEPTION 'INVALID_SERVICE' USING ERRCODE = '22023';
  END IF;

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
    AND p_fecha + p_hora_inicio < r.fecha + r.hora_inicio
      + make_interval(mins => r.duracion_min + COALESCE(v_config.turno_gap_min, 30))
    AND r.fecha + r.hora_inicio < p_fecha + p_hora_inicio
      + make_interval(mins => p_duracion_min + COALESCE(v_config.turno_gap_min, 30));

  IF v_personas_online + p_personas >
    FLOOR(v_total_capacidad * v_config.capacidad_online_pct / 100.0) THEN
    RAISE EXCEPTION 'NO_TABLE_AVAILABILITY' USING ERRCODE = 'P0001';
  END IF;

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
        AND p_fecha + p_hora_inicio < r.fecha + r.hora_inicio
          + make_interval(mins => r.duracion_min + COALESCE(v_config.turno_gap_min, 30))
        AND r.fecha + r.hora_inicio < p_fecha + p_hora_inicio
          + make_interval(mins => p_duracion_min + COALESCE(v_config.turno_gap_min, 30))
    )
  ORDER BY m.capacidad, m.numero
  LIMIT 1;

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
          AND p_fecha + p_hora_inicio < r.fecha + r.hora_inicio
            + make_interval(mins => r.duracion_min + COALESCE(v_config.turno_gap_min, 30))
          AND r.fecha + r.hora_inicio < p_fecha + p_hora_inicio
            + make_interval(mins => p_duracion_min + COALESCE(v_config.turno_gap_min, 30))
      )
    ORDER BY a.capacidad + b.capacidad, a.numero, b.numero
    LIMIT 1;
  END IF;

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
          AND p_fecha + p_hora_inicio < r.fecha + r.hora_inicio
            + make_interval(mins => r.duracion_min + COALESCE(v_config.turno_gap_min, 30))
          AND r.fecha + r.hora_inicio < p_fecha + p_hora_inicio
            + make_interval(mins => p_duracion_min + COALESCE(v_config.turno_gap_min, 30))
      )
    ORDER BY a.capacidad + b.capacidad + c.capacidad, a.numero, b.numero, c.numero
    LIMIT 1;
  END IF;

  -- Four connected tables for larger online parties.
  IF v_mesa_ids IS NULL AND p_personas >= 7 THEN
    WITH RECURSIVE libres AS (
      SELECT m.id, m.capacidad, m.adjacent_mesa_ids
      FROM mesas m
      WHERE m.activa AND m.combinable
        AND NOT EXISTS (
          SELECT 1 FROM reservas r
          WHERE r.fecha = p_fecha
            AND r.estado IN ('Confirmada', 'Sentado', 'WalkIn')
            AND m.id = ANY(r.mesa_ids)
            AND p_fecha + p_hora_inicio < r.fecha + r.hora_inicio
              + make_interval(mins => r.duracion_min + COALESCE(v_config.turno_gap_min, 30))
            AND r.fecha + r.hora_inicio < p_fecha + p_hora_inicio
              + make_interval(mins => p_duracion_min + COALESCE(v_config.turno_gap_min, 30))
        )
    ), conectadas(ids, capacidad) AS (
      SELECT ARRAY[id], capacidad::integer FROM libres
      UNION
      SELECT ARRAY(SELECT x FROM unnest(c.ids || m.id) AS x ORDER BY x),
             c.capacidad + m.capacidad
      FROM conectadas c
      JOIN libres m ON NOT (m.id = ANY(c.ids))
      WHERE cardinality(c.ids) < 4
        AND EXISTS (
          SELECT 1 FROM libres a
          WHERE a.id = ANY(c.ids)
            AND a.id = ANY(m.adjacent_mesa_ids)
            AND m.id = ANY(a.adjacent_mesa_ids)
        )
    )
    SELECT ids INTO v_mesa_ids
    FROM conectadas
    WHERE cardinality(ids) = 4 AND capacidad >= p_personas
    ORDER BY capacidad, ids
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
$function$;
