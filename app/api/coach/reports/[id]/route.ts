import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isCoachAdmin } from "@/lib/auth/guards";
import {
  INCIDENT_STATUSES,
  type DbCoachIncidentReport,
  type IncidentStatus,
} from "@/lib/coach/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isIncidentStatus(value: unknown): value is IncidentStatus {
  return (
    typeof value === "string" &&
    (INCIDENT_STATUSES as readonly string[]).includes(value)
  );
}

/** Cambia el estado de un reporte (owner/manager). Body: { status }. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "not_authenticated", message: "Debes iniciar sesión." },
      { status: 401 },
    );
  }
  if (!isCoachAdmin(user)) {
    return NextResponse.json(
      { error: "forbidden", message: "Solo gestión puede gestionar reportes." },
      { status: 403 },
    );
  }

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: "invalid_report", message: "Reporte inválido." },
      { status: 400 },
    );
  }

  let body: { status?: unknown };
  try {
    body = (await request.json()) as { status?: unknown };
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Solicitud inválida." },
      { status: 400 },
    );
  }
  if (!isIncidentStatus(body.status)) {
    return NextResponse.json(
      { error: "invalid_status", message: "Estado inválido." },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "coach_not_configured", message: "Servicio no disponible." },
      { status: 503 },
    );
  }

  const reviewed = body.status !== "pending";
  const { data, error } = await supabase
    .from("coach_incident_reports")
    .update({
      status: body.status,
      reviewed_at: reviewed ? new Date().toISOString() : null,
      reviewed_by: reviewed ? user.name : null,
    })
    .eq("id", id)
    .select("id, status, reviewed_at, reviewed_by")
    .maybeSingle<
      Pick<DbCoachIncidentReport, "id" | "status" | "reviewed_at" | "reviewed_by">
    >();

  if (error || !data) {
    return NextResponse.json(
      { error: "report_not_found", message: "Reporte no encontrado." },
      { status: 404 },
    );
  }

  return NextResponse.json({ report: data });
}
