import bcrypt from "bcryptjs";
import { findEmployeeIdByAttendancePin } from "@/lib/attendance/employee-pins";
import type { Role } from "@/lib/auth/permissions";
import type { SessionUser } from "@/lib/auth/session";
import { findKioskEmployee } from "@/lib/kiosk/employees";
import { findStaffMember } from "@/lib/staff/data";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/** Database-issued PINs stay hashed and resolve only their linked employee account. */
export async function findDatabasePinAccount(pin: string) {
  if (!/^\d{4,8}$/.test(pin)) return null;
  const db = getSupabaseAdmin();
  if (!db) return null;
  const { data, error } = await db.from("attendance_credentials")
    .select("employee_key,pin_hash").eq("active", true);
  if (error) return null;
  const matches: string[] = [];
  for (const credential of data ?? []) {
    if (await bcrypt.compare(pin, credential.pin_hash)) matches.push(credential.employee_key);
  }
  if (matches.length !== 1) return null;
  const { data: users, error: userError } = await db.from("users")
    .select("email,name,role_id,employee_key").eq("employee_key", matches[0]).limit(2);
  return !userError && users?.length === 1 ? users[0] : null;
}

/**
 * Resuelve el empleado al que pertenece un PIN, mirando primero el listado
 * estático (KARUMA_ATTENDANCE_PINS) y luego los PIN guardados en base de
 * datos. Devuelve el usuario de sesión que le tocaría, pero NO crea sesión:
 * el que llama decide si antes hace falta el código SMS.
 *
 * Es la misma resolución que hacía /api/auth/login en línea; se extrajo aquí
 * para que el segundo paso (verificar el código) pueda repetirla, igual que
 * el admin revalida usuario+contraseña al verificar su código.
 */
export async function resolveEmployeePinUser(pin: string): Promise<SessionUser | null> {
  const clean = pin.trim();

  if (/^\d{4}$/.test(clean)) {
    const employeeId = findEmployeeIdByAttendancePin(clean);
    const employee = employeeId ? findKioskEmployee(employeeId) : null;
    const staff = employeeId ? findStaffMember(employeeId) : null;
    if (employeeId && employee && staff) {
      return {
        name: employee.name,
        email: `${employeeId}@karuma.local`,
        role: staff.role as Role,
        employeeId,
      };
    }
  }

  if (/^\d{4,8}$/.test(clean)) {
    const account = await findDatabasePinAccount(clean);
    if (account) {
      return {
        name: account.name,
        email: account.email,
        role: account.role_id as Role,
        employeeId: account.employee_key,
      };
    }
  }

  return null;
}
