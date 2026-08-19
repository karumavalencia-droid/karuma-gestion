/**
 * Documentos confidenciales (solo owner).
 *
 * GET  /api/documentos?categoria=...  → lista
 * POST /api/documentos                → subida (multipart/form-data)
 *   campos: file, categoria, notas?
 *
 * Los documentos generales se guardan en el bucket privado "documentos".
 * Las facturas se guardan en el bucket privado "facturas" y se deduplican por SHA-256.
 */

import { createHash } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/owner-guard";
import {
  DOCUMENTO_CATEGORIAS as CATEGORIAS,
  getDocumentoBucket,
  type DocumentoCategoria,
} from "@/lib/documentos/constants";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB por archivo

const DOCUMENTO_SELECT = [
  "id",
  "nombre",
  "categoria",
  "mime_type",
  "tamano_bytes",
  "notas",
  "created_at",
  "tipo_documento",
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
    .select(DOCUMENTO_SELECT)
    .order("fecha_documento", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (categoria && CATEGORIAS.includes(categoria as DocumentoCategoria)) {
    query = query.eq("categoria", categoria);
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
  const categoria: DocumentoCategoria = CATEGORIAS.includes(categoriaRaw as DocumentoCategoria)
    ? (categoriaRaw as DocumentoCategoria)
    : "otros";
  const notas = String(form.get("notas") ?? "").trim() || null;
  const esFactura = categoria === "facturas";
  const bucket = getDocumentoBucket(categoria);

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileSha256 = createHash("sha256").update(buffer).digest("hex");

  // Evita guardar dos veces exactamente el mismo archivo, venga del origen que venga.
  const { data: duplicate, error: duplicateError } = await supabase
    .from("documentos")
    .select("id, nombre, categoria")
    .eq("file_sha256", fileSha256)
    .maybeSingle();

  if (duplicateError) {
    console.error("[documentos] Error comprobando duplicado:", duplicateError);
    return NextResponse.json({ error: "Error comprobando duplicados" }, { status: 500 });
  }

  if (duplicate) {
    return NextResponse.json(
      {
        error: "Este archivo ya está guardado",
        duplicate_of: duplicate.id,
        documento: duplicate,
      },
      { status: 409 },
    );
  }

  // Ruta única: <categoria>/<YYYY-MM>/<timestamp>-<nombre saneado>
  const safeName = file.name.replace(/[^\w.\-]+/g, "_").slice(-120) || "documento";
  const now = new Date();
  const yearMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const storagePath = `${categoria}/${yearMonth}/${Date.now()}-${safeName}`;

  const { error: uploadError } = await supabase.storage.from(bucket).upload(storagePath, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (uploadError) {
    console.error(`[documentos] Error subiendo a storage (${bucket}):`, uploadError);
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
      tipo_documento: esFactura ? "factura" : null,
      source_type: "upload",
      file_sha256: fileSha256,
      processing_status: esFactura ? "needs_review" : "stored",
      metadata: { storage_bucket: bucket },
    })
    .select(DOCUMENTO_SELECT)
    .single();

  if (error) {
    // Limpieza: si falla la metadata, no dejar el archivo huérfano.
    await supabase.storage.from(bucket).remove([storagePath]);
    console.error("[documentos] Error guardando metadata:", error);
    return NextResponse.json({ error: "Error guardando el documento" }, { status: 500 });
  }

  return NextResponse.json({ documento: data }, { status: 201 });
}
