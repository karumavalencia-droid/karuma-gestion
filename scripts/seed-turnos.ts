import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import { allTurnoRowsFromMock } from "../lib/schedule/portal";
import type { Database } from "../lib/supabase/types";

loadEnvConfig(process.cwd());

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
  );
}

async function main() {
  const rows = allTurnoRowsFromMock();
  const employeeKeys = [...new Set(rows.map((row) => row.employee_key))];

  const supabase = createClient<Database>(url!, serviceKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Reemplazo completo de la plantilla de los empleados seedeados para no
  // dejar filas obsoletas (p. ej. un descanso que pasa a ser día de trabajo).
  const { error: deleteError } = await supabase
    .from("turnos")
    .delete()
    .in("employee_key", employeeKeys);
  if (deleteError) throw new Error(deleteError.message);

  const { error: insertError } = await supabase.from("turnos").insert(rows);
  if (insertError) throw new Error(insertError.message);

  console.log(
    `Turnos seeded: ${rows.length} rows for ${employeeKeys.length} employees`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
