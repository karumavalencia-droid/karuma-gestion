// ─── Documentos financieros privados (bucket privado) ─────────────────────────
// GET: lista metadatos. POST: sube (multipart). DELETE: borra objeto + metadato.
// El binario vive en el bucket privado 'private-finance'; nunca URL pública.

import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireOwnerApi, ownerJson, NO_STORE_HEADERS } from "@/lib/owner/guards";
import { writePrivateAudit } from "@/lib/owner/audit";
import {
  asEnum,
  asOptionalString,
  checkUploadFile,
  isSameOrigin,
  isSafeStoragePath,
  sanitizeFileName,
} from "@/lib/owner/validation";
import { PRIVATE_FINANCE_BUCKET } from "@/lib/owner/db-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREFIX = "finance/";

function admin(): SupabaseClient | null {
  return getSupabaseAdmin() as unknown as SupabaseClient | null;
}
function bad(message: string, status = 400): NextResponse {
  return NextResponse.json({ error: "invalid_input", message }, { status, headers: NO_STORE_HEADERS });
}

export async function GET() {
  const guard = await requireOwnerApi();
  if (!guard.ok) return guard.response;
  const db = admin();
  if (!db) return bad("Base de datos no disponible.");

  const { data, error } = await db
    .from("private_financial_documents")
    .select("id, file_name, mime_type, size_bytes, category, description, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) return bad("No se pudieron leer los documentos.");

  await writePrivateAudit({
    actorId: guard.ctx.userId,
    actorEmail: guard.ctx.email,
    action: "view",
    resource: "private_financial_documents",
  });
  return ownerJson({ items: data ?? [] });
}

export async function POST(request: Request) {
  const guard = await requireOwnerApi();
  if (!guard.ok) return guard.response;
  if (!isSameOrigin(request)) return bad("Origen no válido.", 403);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return bad("Solicitud inválida.");
  }
  const file = form.get("file");
  if (!(file instanceof File)) return bad("Falta el archivo.");

  const check = checkUploadFile({ type: file.type, size: file.size });
  if (!check.ok) return bad(check.error ?? "Archivo no válido.");

  const category = asEnum(form.get("category"), [
    "banco",
    "nomina",
    "alquiler",
    "otros",
  ] as const) ?? "otros";
  const description = asOptionalString(form.get("description"), 500);
  const safeName = sanitizeFileName(file.name);
  const storagePath = `${PREFIX}${randomUUID()}.${check.ext}`;
  if (!isSafeStoragePath(storagePath, PREFIX)) return bad("Ruta inválida.");

  const db = admin();
  if (!db) return bad("Base de datos no disponible.");

  const buffer = Buffer.from(await file.arrayBuffer());
  const { error: upErr } = await db.storage
    .from(PRIVATE_FINANCE_BUCKET)
    .upload(storagePath, buffer, { contentType: file.type, upsert: false });
  if (upErr) return bad("No se pudo subir el archivo.");

  const { data, error } = await db
    .from("private_financial_documents")
    .insert({
      storage_path: storagePath,
      file_name: safeName,
      mime_type: file.type,
      size_bytes: file.size,
      category,
      description,
      uploaded_by: guard.ctx.userId,
    })
    .select("id, file_name, mime_type, size_bytes, category, description, created_at")
    .single();
  if (error) {
    // Rollback del objeto si falla el metadato.
    await db.storage.from(PRIVATE_FINANCE_BUCKET).remove([storagePath]);
    return bad("No se pudo registrar el documento.");
  }

  await writePrivateAudit({
    actorId: guard.ctx.userId,
    actorEmail: guard.ctx.email,
    action: "upload",
    resource: "private_financial_documents",
    resourceId: (data as { id?: string })?.id ?? null,
    request,
  });
  return ownerJson({ item: data }, { status: 201 });
}

export async function DELETE(request: Request) {
  const guard = await requireOwnerApi();
  if (!guard.ok) return guard.response;
  if (!isSameOrigin(request)) return bad("Origen no válido.", 403);

  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) return bad("Id inválido.");

  const db = admin();
  if (!db) return bad("Base de datos no disponible.");

  const { data: doc } = await db
    .from("private_financial_documents")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  const storagePath = (doc as { storage_path?: string } | null)?.storage_path;
  if (storagePath && isSafeStoragePath(storagePath, PREFIX)) {
    await db.storage.from(PRIVATE_FINANCE_BUCKET).remove([storagePath]);
  }
  const { error } = await db.from("private_financial_documents").delete().eq("id", id);
  if (error) return bad("No se pudo borrar.");

  await writePrivateAudit({
    actorId: guard.ctx.userId,
    actorEmail: guard.ctx.email,
    action: "delete",
    resource: "private_financial_documents",
    resourceId: id,
    request,
  });
  return ownerJson({ ok: true });
}
