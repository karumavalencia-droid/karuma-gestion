import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { resolvePayrollStaffId } from "@/lib/staff/payroll-identity";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const SELECT = "id,nombre,periodo,document_date,created_at,mime_type,tamano_bytes";

export async function GET(request: NextRequest) {
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

  const requestedEmployeeId = request.nextUrl.searchParams.get("employee_id");
  const employeeId = user.role === "owner" && requestedEmployeeId
    ? requestedEmployeeId
    : await resolvePayrollStaffId(user);

  if (!employeeId) {
    return NextResponse.json({ nominas: [] });
  }

  const { data, error } = await supabase
    .from("documentos")
    .select(SELECT)
    .eq("categoria", "nominas")
    .eq("employee_id", employeeId)
    .is("deleted_at", null)
    .order("periodo", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[nominas] Error listando:", error);
    return NextResponse.json({ error: "Error consultando nóminas" }, { status: 500 });
  }

  return NextResponse.json({ nominas: data ?? [] }, {
    headers: { "Cache-Control": "no-store" },
  });
}
