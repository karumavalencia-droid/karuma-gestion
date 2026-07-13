# Migraciones Supabase

Las migraciones (`NNN_*.sql`) se aplican **manualmente en el SQL Editor del dashboard de Supabase**:

1. Abre `https://supabase.com/dashboard/project/<PROJECT_REF>/sql/new`
2. Pega el contenido del/los fichero(s) `.sql` en orden numérico.
3. Pulsa **Run**. Si el SQL contiene algún `DROP` (p. ej. `DROP POLICY IF EXISTS`),
   Supabase muestra un aviso "Potential issue detected" → confirma **Run query**.

Después de `010_turnos.sql`, carga la plantilla semanal con `npm run seed:turnos`.

## Por qué no hay script de migración

No existe una vía programática para aplicar DDL con las credenciales del proyecto:

- `.env.local` solo tiene `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`.
  No hay connection string de Postgres ni contraseña de la BD.
- El service-role key es un JWT para **PostgREST** (datos vía `@supabase/supabase-js`),
  **no** es la contraseña de Postgres, así que no sirve para `CREATE TABLE`.
- `db.<ref>.supabase.co` no resuelve en proyectos nuevos (usan pooler); el host de la
  API (`<ref>.supabase.co`) es Cloudflare, no Postgres.

Por eso el antiguo `scripts/setup-db.py` no funcionaba (usaba el service-role key como
password de Postgres y apuntaba al host de la API) y se eliminó. Si en el futuro quieres
automatizar migraciones, añade la connection string del pooler (Settings → Database) a un
secreto y usa `psql` o la CLI de Supabase (`supabase db push`).
