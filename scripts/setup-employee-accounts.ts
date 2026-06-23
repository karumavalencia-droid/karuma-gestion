import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import { getAllAttendancePins } from "../lib/attendance/employee-pins";
import { STAFF_MEMBERS } from "../lib/staff/data";
import type { Database, DbUserInsert } from "../lib/supabase/types";

loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const pins = getAllAttendancePins();

if (!url || !serviceKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
  );
}
const selected = STAFF_MEMBERS.filter((employee) => {
  const pin = pins[employee.id];
  return typeof pin === "string" && /^\d{4}$/.test(pin);
});

if (selected.length === 0) {
  throw new Error("No employee has a configured 4-digit PIN");
}

const rows: DbUserInsert[] = await Promise.all(
  selected.map(async (employee) => ({
    email: employee.email.toLowerCase(),
    password_hash: await bcrypt.hash(pins[employee.id]!, 12),
    name: employee.name,
    role_id: employee.role,
    employee_key: employee.id,
  })),
);

const supabase = createClient<Database>(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { error } = await supabase
  .from("users")
  .upsert(rows, { onConflict: "email" });

if (error) throw new Error(error.message);

console.log(`Employee accounts created or updated: ${rows.length}`);
