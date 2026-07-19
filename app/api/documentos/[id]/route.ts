/**
 * GET    /api/documentos/:id → URL firmada de descarga (5 min) — solo owner
 * DELETE /api/documentos/:id → borra archivo + metadata — solo owner
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/owner-guard";
import { DOCUMENTOS_BUCKET } from "@/lib/documentos/constants";
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
    .select("storage_path, nombre")
    .eq("id", id)
    .maybeSingle();

  if (error || !doc) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const { data: signed, error: signError } = await supabase.storage
    .from(DOCUMENTOS_BUCKET)
    .createSignedUrl(doc.storage_path, 60 * 5, { download: doc.nombre });

  if (signError || !signed?.signedUrl) {
    console.error("[documentos] Error firmando URL:", signError);
    return NextResponse.json({ error: "Error generando descarga" }, { status: 500 });
  }

  return NextResponse.json({ url: signed.signedUrl });
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
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  }

  const { error: storageError } = await supabase.storage
    .from(DOCUMENTOS_BUCKET)
    .remove([doc.storage_path]);
  if (storageError) {
    console.error("[documentos] Error borrando archivo:", storageError);
    return NextResponse.json({ error: "Error borrando el archivo" }, { status: 500 });
  }

  const { error } = await supabase.from("documentos").delete().eq("id", id);
  if (error) {
    console.error("[documentos] Error borrando metadata:", error);
    return NextResponse.json({ error: "Error borrando el documento" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
