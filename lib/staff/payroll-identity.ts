import type { SessionUser } from "@/lib/auth/session";
import { resolveStaffRow } from "@/lib/staff/identity";

/** Resolve only the signed session identity; never accept a requested name. */
export async function resolvePayrollStaffId(user: SessionUser): Promise<string | null> {
  const row = await resolveStaffRow<{ id: string }>(user.employeeId, "id", "nómina");
  return row?.id ?? null;
}
