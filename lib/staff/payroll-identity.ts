import type { SessionUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { findStaffMember } from "@/lib/staff/data";

/** Resolve only the signed session identity; never accept a requested name. */
export async function resolvePayrollStaffId(user: SessionUser): Promise<string | null> {
  if (!user.employeeId) return null;
  const db = getSupabaseAdmin();
  if (!db) return null;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  let name = findStaffMember(user.employeeId)?.name;
  if (!uuid.test(user.employeeId) && !name) {
    // Database-backed accounts may not exist in the older static portal roster.
    const { data: accounts, error } = await db.from("users").select("name")
      .eq("employee_key", user.employeeId).limit(2);
    if (error) throw new Error("No se pudo resolver la cuenta de nómina");
    if (accounts?.length !== 1) return null;
    name = accounts[0].name;
  }
  if (!uuid.test(user.employeeId) && !name) return null;
  // ILIKE must remain a literal exact-name comparison, not a wildcard search.
  const literalName = (name ?? "").replace(/[\\%_]/g, "\\$&");
  const query = db.from("staff").select("id");
  const { data, error } = await (uuid.test(user.employeeId)
    ? query.eq("id", user.employeeId)
    : query.ilike("name", literalName)).limit(2);
  if (error) throw new Error("No se pudo resolver la identidad de nómina");
  return data?.length === 1 ? data[0].id : null;
}
