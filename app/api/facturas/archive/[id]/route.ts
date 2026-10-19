import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/owner-guard";
import { getDocumentoBucket } from "@/lib/documentos/constants";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

/**
 * Generate a short-lived download URL for one invoice.
 *
 * The categoria predicate prevents this read-only endpoint from being used to
 * access any other private documento.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireOwner(request);
  if ("response" in guard) return guard.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  const { id } = await params;
  const { data: factura, error } = await supabase
    .from("documentos")
    .select("storage_path, storage_bucket, nombre, categoria")
    .eq("id", id)
    .eq("categoria", "facturas")
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !factura) {
    return NextResponse.json({ error: "Factura no encontrada" }, { status: 404 });
  }

  // Older imports live in documentos even after classification as facturas.
  // The persisted location is authoritative; category is only a legacy default.
  if (factura.storage_path?.startsWith("drive://")) {
    const fileId = factura.storage_path.slice("drive://".length);
    if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
      return NextResponse.json({ error: "Referencia de Drive inválida" }, { status: 422 });
    }
    return NextResponse.json(
      { url: `https://drive.google.com/uc?export=download&id=${encodeURIComponent(fileId)}` },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  }
  if (!factura.storage_path) {
    return NextResponse.json({ error: "La factura no tiene archivo original" }, { status: 422 });
  }
  const bucket = factura.storage_bucket || getDocumentoBucket(factura.categoria);
  const { data: signed, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(factura.storage_path, 60 * 5, { download: factura.nombre });

  if (signError || !signed?.signedUrl) {
    console.error("[facturas/archive] Error firmando URL:", signError);
    return NextResponse.json({ error: "Error generando descarga" }, { status: 500 });
  }

  return NextResponse.json(
    { url: signed.signedUrl },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}

