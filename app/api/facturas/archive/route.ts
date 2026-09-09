import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/owner-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const FACTURA_SELECT = [
  "id",
  "nombre",
  "categoria",
  "created_at",
  "proveedor",
  "nif_proveedor",
  "fecha_documento",
  "numero_documento",
  "subtotal",
  "iva",
  "total",
  "moneda",
  "source_type",
  "processing_status",
  "extraction_confidence",
].join(", ");

/**
 * Read-only invoice archive for owner/office accounts.
 *
 * This deliberately exposes only documentos in categoria=facturas; the
 * broader /api/documentos module remains restricted to the Admin session.
 */
export async function GET(request: NextRequest) {
  const guard = await requireOwner(request);
  if ("response" in guard) return guard.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("documentos")
    .select(FACTURA_SELECT)
    .eq("categoria", "facturas")
    .order("fecha_documento", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("[facturas/archive] Error listando:", error);
    return NextResponse.json({ error: "Error consultando facturas" }, { status: 500 });
  }

  return NextResponse.json({ documentos: data ?? [] });
}
