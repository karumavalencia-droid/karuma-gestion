import type { SessionUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolvePayrollStaffId } from "@/lib/staff/payroll-identity";

export const PAYROLL_TOOL = {
  type: "function" as const,
  name: "get_my_nomina",
  description:
    "Busca la nómina del mes solicitado del empleado que ha iniciado sesión. Solo permite consultar la nómina propia: la identidad del empleado sale de la sesión y nunca se acepta employeeId ni nombre como argumento.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      month: {
        type: "integer",
        minimum: 1,
        maximum: 12,
        description: "Mes de la nómina, 1-12.",
      },
      year: {
        type: ["integer", "null"],
        minimum: 2020,
        maximum: 2100,
        description: "Año de la nómina. null = año actual en Valencia.",
      },
    },
    additionalProperties: false,
    required: ["month", "year"],
  },
};

export async function runGetMyNomina(
  args: unknown,
  user: SessionUser,
): Promise<string> {
  if (!user.employeeId) {
    return JSON.stringify({
      error: "not_linked",
      message: "Esta cuenta no está vinculada a un empleado.",
    });
  }

  const input = (args ?? {}) as { month?: unknown; year?: unknown };
  const month = typeof input.month === "number" ? Math.trunc(input.month) : 0;
  if (month < 1 || month > 12) {
    return JSON.stringify({
      error: "invalid_month",
      message: "Pregunta al empleado de qué mes necesita la nómina.",
    });
  }

  const currentYear = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Europe/Madrid",
      year: "numeric",
    }).format(new Date()),
  );
  const year =
    typeof input.year === "number" && Number.isFinite(input.year)
      ? Math.trunc(input.year)
      : currentYear;
  if (year < 2020 || year > 2100) {
    return JSON.stringify({ error: "invalid_year" });
  }

  const periodo = `${year}-${String(month).padStart(2, "0")}`;
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return JSON.stringify({
      error: "payroll_unavailable",
      message: "Las nóminas no están disponibles ahora mismo.",
    });
  }

  const employeeId = await resolvePayrollStaffId(user);
  if (!employeeId) return JSON.stringify({ error: "not_linked" });
  const { data, error } = await supabase
    .from("documentos")
    .select("id,nombre,periodo")
    .eq("categoria", "nominas")
    .eq("employee_id", employeeId)
    .eq("periodo", periodo)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[coach/payroll] Error buscando nómina:", error.message);
    return JSON.stringify({
      error: "payroll_unavailable",
      message: "Las nóminas no están disponibles ahora mismo.",
    });
  }

  if (!data) {
    return JSON.stringify({
      ok: true,
      found: false,
      periodo,
      message: "Todavía no está disponible la nómina de ese mes.",
    });
  }

  return JSON.stringify({
    ok: true,
    found: true,
    periodo,
    nombre: data.nombre,
    downloadUrl: `/api/nominas/${data.id}/download`,
    message: "Nómina encontrada. Ofrece el botón/enlace de descarga al empleado.",
  });
}
