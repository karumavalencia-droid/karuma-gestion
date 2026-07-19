/**
 * Documentos confidenciales (solo owner). Bucket privado "documentos".
 *
 * GET  /api/documentos?categoria=...  → lista
 * POST /api/documentos                → subida (multipart/form-data)
 *   campos: file, categoria, notas?
 */

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/owner-guard";
import {
  DOCUMENTOS_BUCKET,
  DOCUMENTO_CATEGORIAS as CATEGORIAS,
} from "@/lib/documentos/constants";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { DbDocumentoCategoria } from "@/lib/supabase/types";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB por archivo

export async function GET(request: NextRequest) {
  const guard = await requireOwner(request);
  if ("response" in guard) return guard.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  const categoria = request.nextUrl.searchParams.get("categoria");
  let query = supabase
    .from("documentos")
    .select("id, nombre, categoria, mime_type, tamano_bytes, notas, created_at")
    .order("created_at", { ascending: false });

  if (categoria && CATEGORIAS.includes(categoria as DbDocumentoCategoria)) {
    query = query.eq("categoria", categoria as DbDocumentoCategoria);
  }

  const { data, error } = await query.limit(500);
  if (error) {
    console.error("[documentos] Error listando:", error);
    return NextResponse.json({ error: "Error consultando documentos" }, { status: 500 });
  }

  return NextResponse.json({ documentos: data ?? [] });
}

export async function POST(request: NextRequest) {
  const guard = await requireOwner(request);
  if ("response" in guard) return guard.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Se esperaba multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Archivo demasiado grande (máx. 25 MB)" }, { status: 400 });
  }

  const categoriaRaw = String(form.get("categoria") ?? "otros");
  const categoria = CATEGORIAS.includes(categoriaRaw as DbDocumentoCategoria)
    ? (categoriaRaw as DbDocumentoCategoria)
    : "otros";
  const notas = String(form.get("notas") ?? "").trim() || null;

  // Ruta única en el bucket: <categoria>/<timestamp>-<nombre saneado>
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-120) || "documento";
  const storagePath = `${categoria}/${Date.now()}-${safeName}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: uploadError } = await supabase.storage
    .from(DOCUMENTOS_BUCKET)
    .upload(storagePath, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: false,
    });

  if (uploadError) {
    console.error("[documentos] Error subiendo a storage:", uploadError);
    return NextResponse.json({ error: "Error subiendo el archivo" }, { status: 500 });
  }

  const { data, error } = await supabase
    .from("documentos")
    .insert({
      nombre: file.name,
      categoria,
      storage_path: storagePath,
      mime_type: file.type || null,
      tamano_bytes: file.size,
      notas,
    })
    .select("id, nombre, categoria, mime_type, tamano_bytes, notas, created_at")
    .single();

  if (error) {
    // Limpieza: si falla la metadata, no dejar el archivo huérfano.
    await supabase.storage.from(DOCUMENTOS_BUCKET).remove([storagePath]);
    console.error("[documentos] Error guardando metadata:", error);
    return NextResponse.json({ error: "Error guardando el documento" }, { status: 500 });
  }

  return NextResponse.json({ documento: data }, { status: 201 });
}
