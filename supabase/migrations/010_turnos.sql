-- Karuma ERP — turnos semanales para el portal del empleado
-- Plantilla semanal: una fila por empleado + día + servicio.
-- dia: 0 = Domingo, 1 = Lunes, ..., 6 = Sábado (misma convención que horario_semanal)

CREATE TABLE IF NOT EXISTS turnos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_key TEXT NOT NULL,
  dia SMALLINT NOT NULL CHECK (dia BETWEEN 0 AND 6),
  servicio TEXT NOT NULL CHECK (servicio IN ('Comida', 'Cena', 'Descanso')),
  hora_inicio TIME,
  hora_fin TIME,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_key, dia, servicio),
  CHECK (
    servicio = 'Descanso'
    OR (hora_inicio IS NOT NULL AND hora_fin IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_turnos_employee_dia ON turnos (employee_key, dia);

ALTER TABLE turnos ENABLE ROW LEVEL SECURITY;

-- Mismo modelo que attendance_events: solo el service role (API del servidor)
-- accede a la tabla; la API filtra por el empleado de la sesión.
DROP POLICY IF EXISTS "service_manage_turnos" ON turnos;
CREATE POLICY "service_manage_turnos" ON turnos
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Después de aplicar esta migración, carga la plantilla semanal con:
-- npm run seed:turnos
