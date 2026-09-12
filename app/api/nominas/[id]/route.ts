import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { resolvePayrollStaffId } from "@/lib/staff/payroll-identity";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  const { id } = await params;
  const { data: doc, error } = await supabase
    .from("documentos")
    .select("id,storage_path,nombre,categoria,employee_id")
    .eq("id", id)
    .eq("categoria", "nominas")
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !doc) {
    return NextResponse.json({ error: "Nómina no encontrada" }, { status: 404 });
  }

  const employeeId = await resolvePayrollStaffId(user);
  if (!employeeId || doc.employee_id !== employeeId) {
    return NextResponse.json({ error: "No tienes acceso a esta nómina" }, { status: 403 });
  }
  return NextResponse.json({ url: `/api/nominas/${id}/download`, nombre: doc.nombre }, {
    headers: { "Cache-Control": "no-store" },
  });
}
