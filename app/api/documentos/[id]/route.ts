/**
 * GET    /api/documentos/:id → URL firmada de descarga (5 min) — solo owner
 * DELETE /api/documentos/:id → borra archivo + metadata — solo owner
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/owner-guard";
import { getDocumentoBucket } from "@/lib/documentos/constants";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

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
  const { data: doc, error } = await supabase
    .from("documentos")
    .select("storage_path, nombre, categoria, employee_id")
    .eq("id", id)
    .maybeSingle();

  if (error || !doc) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  // Individual payroll downloads must go through the session-bound endpoint.
  if (doc.categoria === "nominas" && doc.employee_id) {
    return NextResponse.json({ url: `/api/nominas/${id}/download` }, {
      headers: { "Cache-Control": "no-store" },
    });
  }

  const preview = request.nextUrl.searchParams.get("action") === "open";
  if (doc.storage_path.startsWith("drive://")) {
    const fileId = doc.storage_path.slice("drive://".length);
    if (!/^[a-zA-Z0-9_-]+$/.test(fileId)) {
      return NextResponse.json({ error: "Referencia de Google Drive inválida" }, { status: 422 });
    }
    const url = preview
      ? `https://drive.google.com/file/d/${fileId}/view`
      : `https://drive.google.com/uc?export=download&id=${fileId}`;
    return NextResponse.json({ url }, { headers: { "Cache-Control": "no-store" } });
  }

  const bucket = getDocumentoBucket(doc.categoria);
  const { data: signed, error: signError } = await supabase.storage
    .from(bucket)
    .createSignedUrl(doc.storage_path, 60 * 5, preview ? {} : { download: doc.nombre });

  if (signError || !signed?.signedUrl) {
    console.error(`[documentos] Error firmando URL (${bucket}):`, signError);
    return NextResponse.json({ error: "Error generando descarga" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl }, { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(
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
  const { data: doc } = await supabase
    .from("documentos")
    .select("storage_path, categoria")
    .eq("id", id)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const bucket = getDocumentoBucket(doc.categoria);
  const { error: storageError } = await supabase.storage.from(bucket).remove([doc.storage_path]);
  if (storageError) {
    console.error(`[documentos] Error borrando archivo (${bucket}):`, storageError);
    return NextResponse.json({ error: "Error borrando el archivo" }, { status: 500 });
  }

  const { error } = await supabase.from("documentos").delete().eq("id", id);
  if (error) {
    console.error("[documentos] Error borrando metadata:", error);
    return NextResponse.json({ error: "Error borrando el documento" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
