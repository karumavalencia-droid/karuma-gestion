import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { isDocumentoOwner } from "@/lib/documentos/permissions";
import { getDocumentoAdmin } from "@/lib/documentos/repository";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!isDocumentoOwner(user)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const requestedIds = body && typeof body === "object" && Array.isArray((body as { documentIds?: unknown }).documentIds)
    ? (body as { documentIds: unknown[] }).documentIds
    : [];
  const documentIds = [...new Set(requestedIds.filter((id): id is string => typeof id === "string" && UUID_PATTERN.test(id)))];

  if (documentIds.length !== requestedIds.length) {
    return NextResponse.json({ error: "La selección contiene identificadores inválidos o repetidos" }, { status: 400 });
  }
  if (documentIds.length < 1 || documentIds.length > 50) {
    return NextResponse.json({ error: "Selecciona entre 1 y 50 documentos" }, { status: 400 });
  }

  try {
    const { data, error } = await getDocumentoAdmin().rpc("confirm_document_batch", {
      p_document_ids: documentIds,
      p_actor_email: user.email,
    });
    if (error) throw new Error(error.message);

    const confirmedIds = (Array.isArray(data) ? data : [])
      .map((row) => row && typeof row === "object" ? String((row as { document_id?: unknown }).document_id ?? "") : "")
      .filter(Boolean);

    if (confirmedIds.length !== documentIds.length) {
      throw new Error("No se confirmaron todos los documentos solicitados");
    }

    return NextResponse.json(
      { confirmedIds, confirmed: confirmedIds.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[documentos] bulk confirm failed", { documentIds, error });
    return NextResponse.json(
      { error: "No se pudo completar la confirmación por lotes. Comprueba que la migration 044 esté aplicada." },
      { status: 500 },
    );
  }
}
