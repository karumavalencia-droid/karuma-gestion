import { findStaffMember } from "@/lib/staff/data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resuelve la fila de `staff` que corresponde al employeeId de una sesión
 * firmada. Nunca acepta un nombre pedido por el cliente: el nombre sale del
 * roster estático o de la tabla `users`, y la consulta falla en cerrado si
 * hay más de una coincidencia.
 *
 * @param columns  columnas a traer de `staff` (formato PostgREST).
 * @param context  se usa para el mensaje de error ("nómina", "login"...).
 */
export async function resolveStaffRow<T>(
  employeeId: string | null | undefined,
  columns: string,
  context: string,
): Promise<T | null> {
  if (!employeeId) return null;
  const db = getSupabaseAdmin();
  if (!db) return null;

  let name = findStaffMember(employeeId)?.name;
  if (!UUID_RE.test(employeeId) && !name) {
    // Las cuentas creadas en base de datos pueden no estar en el roster estático.
    const { data: accounts, error } = await db
      .from("users")
      .select("name")
      .eq("employee_key", employeeId)
      .limit(2);
    if (error) throw new Error(`No se pudo resolver la cuenta de ${context}`);
    if (accounts?.length !== 1) return null;
    name = accounts[0].name;
  }
  if (!UUID_RE.test(employeeId) && !name) return null;

  // ILIKE must remain a literal exact-name comparison, not a wildcard search.
  const literalName = (name ?? "").replace(/[\\%_]/g, "\\$&");
  const query = db.from("staff").select(columns);
  const { data, error } = await (UUID_RE.test(employeeId)
    ? query.eq("id", employeeId)
    : query.ilike("name", literalName)
  ).limit(2);
  if (error) throw new Error(`No se pudo resolver la identidad de ${context}`);
  return data?.length === 1 ? (data[0] as T) : null;
}
