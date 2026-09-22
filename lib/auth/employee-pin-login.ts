import bcrypt from "bcryptjs";
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
    .select("email,name,role_id,employee_key,must_set_password,session_version")
    .eq("employee_key", matches[0]).limit(2);
  return !userError && users?.length === 1 ? users[0] : null;
}
