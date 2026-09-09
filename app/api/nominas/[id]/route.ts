import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken, SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { getDocumentoBucket } from "@/lib/documentos/constants";
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

  // Un empleado solo puede descargar su propia nómina. El owner puede
  // descargar cualquiera para soporte/gestión.
  if (user.role !== "owner" && doc.employee_id !== user.employeeId) {
    return NextResponse.json({ error: "No tienes acceso a esta nómina" }, { status: 403 });
  }

  const bucket = getDocumentoBucket(doc.categoria);
  const { data: signed, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(doc.storage_path, 60 * 5, { download: doc.nombre });

  if (signError || !signed?.signedUrl) {
    console.error("[nominas] Error generando URL firmada:", signError);
    return NextResponse.json({ error: "Error generando la descarga" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl, nombre: doc.nombre }, {
    headers: { "Cache-Control": "no-store" },
  });
}
