-- Karuma ERP — RLS Producción
-- Ejecutar en Supabase SQL Editor ANTES de hacer pública la URL de reservas.
-- Este script reemplaza las políticas abiertas de desarrollo por políticas restrictivas.
--
-- Lógica:
--   - La clave ANON (usada en el navegador del cliente en /reservas) solo puede
--     INSERT en reservas y clientes_reservas. No puede leer nada.
--   - Las API routes (/api/reservas/*) usan la SERVICE ROLE KEY que bypasea RLS.
--   - Las páginas de gestión (/dashboard/*) también usan SERVICE ROLE KEY vía API
--     o la clave ANON con políticas de staff (a implementar con Supabase Auth).
--
-- NOTA: Este script asume que las políticas "dev_open_*" existen. Si ya fueron
-- eliminadas, omitir los DROP POLICY correspondientes.

-- ── MESAS ────────────────────────────────────────────────────────────────────
-- Las API routes leen mesas con service role. La anon key no necesita acceso.
DROP POLICY IF EXISTS "dev_open_mesas" ON mesas;
CREATE POLICY "service_only_mesas" ON mesas
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── CLIENTES_RESERVAS ────────────────────────────────────────────────────────
-- Anon puede INSERT (crear/actualizar cliente al reservar).
-- Solo service role puede SELECT, UPDATE, DELETE.
DROP POLICY IF EXISTS "dev_open_clientes_reservas" ON clientes_reservas;

CREATE POLICY "anon_insert_clientes" ON clientes_reservas
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "service_manage_clientes" ON clientes_reservas
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── RESERVAS ─────────────────────────────────────────────────────────────────
-- Anon puede INSERT (crear reserva desde /reservas).
-- Solo service role puede SELECT, UPDATE, DELETE.
DROP POLICY IF EXISTS "dev_open_reservas" ON reservas;

CREATE POLICY "anon_insert_reservas" ON reservas
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "service_manage_reservas" ON reservas
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── RESERVAS_CONFIG ──────────────────────────────────────────────────────────
-- La anon key necesita leer config (para /api/reservas/config y disponibilidad).
-- Ambas API routes usan service role, así que no es estrictamente necesario.
-- Solo service role puede escribir.
DROP POLICY IF EXISTS "dev_open_config" ON reservas_config;

CREATE POLICY "service_manage_config" ON reservas_config
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── CIERRES_SERVICIO ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "dev_open_cierres" ON cierres_servicio;

CREATE POLICY "service_manage_cierres" ON cierres_servicio
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ── VERIFICACIÓN ─────────────────────────────────────────────────────────────
-- Después de ejecutar, verificar en Table Editor > Authentication > Policies
-- que cada tabla tiene las políticas correctas.
--
-- Prueba rápida desde el SQL Editor (simula anon key):
--   SET ROLE anon;
--   SELECT * FROM reservas;  -- debe devolver 0 filas o error de permisos
--   INSERT INTO reservas (...) VALUES (...);  -- debe funcionar si los campos son válidos
--   RESET ROLE;
