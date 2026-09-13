import type { SessionUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { resolvePayrollStaffId } from "@/lib/staff/payroll-identity";

export const PAYROLL_TOOL = {
  type: "function" as const,
  name: "get_my_nomina",
  description: "Busca exclusivamente la nómina propia del usuario autenticado. Para la última disponible usa month=null y year=null. Nunca acepta nombres ni employeeId.",
  strict: true,
  parameters: {
    type: "object",
    properties: {
      month: { type: ["integer", "null"], minimum: 1, maximum: 12, description: "Mes 1-12; null para la última nómina disponible." },
      year: { type: ["integer", "null"], minimum: 2020, maximum: 2100, description: "Año; null con mes concreto usa el año actual en Valencia, ambos null buscan la última disponible." },
    },
    additionalProperties: false,
    required: ["month", "year"],
  },
};

export async function runGetMyNomina(args: unknown, user: SessionUser): Promise<string> {
  const notLinked = () => JSON.stringify({ error: "not_linked", message: "Esta cuenta no está vinculada a un empleado. No significa que no exista la nómina." });
  if (!user.employeeId) return notLinked();
  const input = (args ?? {}) as { month?: unknown; year?: unknown };
  const latest = input.month === null;
  if (!latest && (typeof input.month !== "number" || !Number.isInteger(input.month) || input.month < 1 || input.month > 12)) {
    return JSON.stringify({ error: "invalid_month", message: "Pregunta qué mes necesita; para la última disponible usa month=null y year=null." });
  }
  if (input.year !== null && (typeof input.year !== "number" || !Number.isInteger(input.year) || input.year < 2020 || input.year > 2100)) {
    return JSON.stringify({ error: "invalid_year" });
  }
  const currentYear = Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid", year: "numeric" }).format(new Date()));
  const year = input.year as number | null;
  const periodo = latest ? null : `${year ?? currentYear}-${String(input.month).padStart(2, "0")}`;
  try {
    const db = getSupabaseAdmin();
    if (!db) throw new Error("Database unavailable");
    const employeeId = await resolvePayrollStaffId(user);
    if (!employeeId) return notLinked();
    let query = db.from("documentos").select("id,nombre,periodo")
      .eq("categoria", "nominas").eq("employee_id", employeeId).is("deleted_at", null);
    if (periodo) query = query.eq("periodo", periodo);
    else {
      query = query.not("periodo", "is", null);
      if (year !== null) query = query.gte("periodo", `${year}-01`).lte("periodo", `${year}-12`);
    }
    const { data, error } = await query.order("periodo", { ascending: false }).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return JSON.stringify({ ok: true, found: false, periodo, message: periodo ? `Todavía no está disponible tu nómina de ${periodo}.` : "Todavía no tienes nóminas individuales disponibles." });
    return JSON.stringify({ ok: true, found: true, periodo: data.periodo, nombre: data.nombre, downloadUrl: `/api/nominas/${data.id}/download`, message: "Nómina encontrada. Indica el periodo devuelto y ofrece el enlace de descarga. No cambies de mes." });
  } catch {
    return JSON.stringify({ error: "payroll_unavailable", message: "No se pudo comprobar tu nómina ahora. Inténtalo de nuevo; no afirmes que no existe." });
  }
}
