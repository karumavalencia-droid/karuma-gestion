-- ============================================================================
-- 039: Nóminas por empleado en el archivo de documentos
--
-- Para que Karuma Coach pueda entregar a cada empleado SU nómina y solo la
-- suya, hace falta saber de quién es cada archivo. Hoy `documentos` solo guarda
-- el nombre del fichero, y emparejar por nombre no es seguro: hay dos empleados
-- llamados Sebastián (sebastian-rodriguez y sebastian-gomez), así que una
-- coincidencia parcial entregaría la nómina equivocada.
--
-- empleado_id guarda el MISMO identificador que usa la sesión del empleado
-- (el slug de lib/staff/data.ts: "alex", "karina", "sebastian-rodriguez"…),
-- no un uuid de la tabla staff.
-- periodo es el mes de la nómina en formato "AAAA-MM".
--
-- Ambas columnas son opcionales: el resto de categorías (bancos, contratos,
-- impuestos…) las deja a NULL y siguen funcionando igual que antes.
--
-- Aplicar manualmente en el SQL Editor del dashboard de Supabase.
-- ============================================================================

ALTER TABLE documentos ADD COLUMN IF NOT EXISTS empleado_id text;
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS periodo text;

-- Búsqueda del Coach: "nóminas de este empleado", más recientes primero.
CREATE INDEX IF NOT EXISTS idx_documentos_empleado_categoria
  ON documentos (empleado_id, categoria, created_at DESC);
