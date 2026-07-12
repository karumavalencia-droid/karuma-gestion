import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isCoachAdmin } from "@/lib/auth/guards";
import {
  INCIDENT_STATUSES,
  type DbCoachIncidentReport,
  type IncidentStatus,
} from "@/lib/coach/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_REPORTS = 100;

/**
 * Lista de reportes de incidencias para gestión (owner/manager).
 * Las cuentas de empleado reciben 403 aunque el middleware deje pasar
 * /api/coach/ para el chat.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "not_authenticated", message: "Debes iniciar sesión." },
      { status: 401 },
    );
  }
  if (!isCoachAdmin(user)) {
    return NextResponse.json(
      { error: "forbidden", message: "Solo gestión puede ver los reportes." },
      { status: 403 },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ reports: [] });
  }

  const statusParam = request.nextUrl.searchParams.get("status");
  const status: IncidentStatus | null =
    statusParam && (INCIDENT_STATUSES as readonly string[]).includes(statusParam)
      ? (statusParam as IncidentStatus)
      : null;

  let query = supabase
    .from("coach_incident_reports")
    .select(
      "id, employee_id, employee_name, category, location, description, priority, status, created_at, reviewed_at, reviewed_by",
    );
  if (status) query = query.eq("status", status);

  const { data, error } = await query
    .order("created_at", { ascending: false })
    .limit(MAX_REPORTS)
    .returns<Omit<DbCoachIncidentReport, "source_conversation_id">[]>();

  if (error) {
    // Tabla aún sin migrar u otro fallo: lista vacía en lugar de romper la página.
    return NextResponse.json({ reports: [] });
  }

  return NextResponse.json(
    { reports: data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
