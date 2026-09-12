import type { SessionUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { findStaffMember } from "@/lib/staff/data";

/** Resolve only the signed session identity; never accept a requested name. */
export async function resolvePayrollStaffId(user: SessionUser): Promise<string | null> {
  if (!user.employeeId) return null;
  const db = getSupabaseAdmin();
  if (!db) return null;
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const employee = findStaffMember(user.employeeId);
  if (!uuid.test(user.employeeId) && !employee) return null;
  const query = db.from("staff").select("id");
  const { data, error } = await (uuid.test(user.employeeId)
    ? query.eq("id", user.employeeId)
    : query.eq("name", employee!.name)).limit(2);
  if (error) throw new Error("No se pudo resolver la identidad de nómina");
  return data?.length === 1 ? data[0].id : null;
}
