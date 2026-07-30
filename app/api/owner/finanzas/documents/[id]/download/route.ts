// ─── GET /api/owner/finanzas/documents/[id]/download ──────────────────────────
// Devuelve una signed URL de CORTA duración (60 s) para el objeto privado.
// Nunca se expone la service-role key ni una URL pública permanente.

import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { requireOwnerApi, ownerJson, NO_STORE_HEADERS } from "@/lib/owner/guards";
import { writePrivateAudit } from "@/lib/owner/audit";
import { isSafeStoragePath } from "@/lib/owner/validation";
import { PRIVATE_FINANCE_BUCKET } from "@/lib/owner/db-types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PREFIX = "finance/";
const SIGNED_TTL_SECONDS = 60;

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const guard = await requireOwnerApi();
  if (!guard.ok) return guard.response;

  const { id } = await context.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return NextResponse.json(
      { error: "invalid_input", message: "Id inválido." },
      { status: 400, headers: NO_STORE_HEADERS },
    );
  }

  const db = getSupabaseAdmin() as unknown as SupabaseClient | null;
  if (!db) {
    return NextResponse.json(
      { error: "unavailable", message: "Base de datos no disponible." },
      { status: 503, headers: NO_STORE_HEADERS },
    );
  }

  const { data: doc } = await db
    .from("private_financial_documents")
    .select("storage_path, file_name")
    .eq("id", id)
    .maybeSingle();
  const storagePath = (doc as { storage_path?: string } | null)?.storage_path;
  if (!storagePath || !isSafeStoragePath(storagePath, PREFIX)) {
    return NextResponse.json(
      { error: "not_found", message: "Documento no encontrado." },
      { status: 404, headers: NO_STORE_HEADERS },
    );
  }

  const { data: signed, error } = await db.storage
    .from(PRIVATE_FINANCE_BUCKET)
    .createSignedUrl(storagePath, SIGNED_TTL_SECONDS, { download: true });
  if (error || !signed) {
    return NextResponse.json(
      { error: "sign_failed", message: "No se pudo generar el enlace." },
      { status: 500, headers: NO_STORE_HEADERS },
    );
  }

  await writePrivateAudit({
    actorId: guard.ctx.userId,
    actorEmail: guard.ctx.email,
    action: "download",
    resource: "private_financial_documents",
    resourceId: id,
    request: _request,
  });
  return ownerJson({ url: signed.signedUrl, expiresIn: SIGNED_TTL_SECONDS });
}
