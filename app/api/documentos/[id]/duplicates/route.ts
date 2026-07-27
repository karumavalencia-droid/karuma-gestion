import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { isDocumentoOwner } from "@/lib/documentos/permissions";
import { getDocumento, getDocumentoAdmin } from "@/lib/documentos/repository";

async function authorize(request: NextRequest) {
  const user = await getSessionUser(request);
  return { user, allowed: isDocumentoOwner(user) };
}

async function getCandidate(documentId: string, candidateId: string) {
  const { data, error } = await getDocumentoAdmin().from("document_duplicate_candidates").select("*").eq("id", candidateId).or(`document_id_a.eq.${documentId},document_id_b.eq.${documentId}`).maybeSingle();
  if (error) throw new Error(error.message);
  return data as Record<string, unknown> | null;
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, allowed } = await authorize(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  const { id } = await context.params;
  try {
    const { data, error } = await getDocumentoAdmin().from("document_duplicate_candidates").select("*").or(`document_id_a.eq.${id},document_id_b.eq.${id}`).order("confidence", { ascending: false });
    if (error) throw new Error(error.message);
    const rows = await Promise.all((data || []).map(async (candidate) => {
      const row = candidate as Record<string, unknown>;
      const otherId = String(row.document_id_a) === id ? String(row.document_id_b) : String(row.document_id_a);
      const other = await getDocumento(otherId);
      return { ...row, other_document: other };
    }));
    return NextResponse.json({ candidates: rows }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[documentos] duplicates list failed", error);
    return NextResponse.json({ error: "No se pudieron cargar los duplicados" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, allowed } = await authorize(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  const { id } = await context.params;
  let body: { candidateId?: unknown; action?: unknown };
  try { body = await request.json() as { candidateId?: unknown; action?: unknown }; } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const candidateId = typeof body.candidateId === "string" ? body.candidateId : "";
  const action = body.action === "confirm" || body.action === "reject" ? body.action : null;
  if (!candidateId || !action) return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  try {
    const candidate = await getCandidate(id, candidateId);
    if (!candidate) return NextResponse.json({ error: "Candidato no encontrado" }, { status: 404 });
    const status = action === "confirm" ? "confirmed" : "rejected";
    const { error: reviewError } = await getDocumentoAdmin().from("document_duplicate_candidates").update({ status, reviewed_at: new Date().toISOString(), reviewed_by_email: user.email }).eq("id", candidateId);
    if (reviewError) throw new Error(reviewError.message);
    if (action === "confirm") {
      const duplicateOf = String(candidate.document_id_a) === id ? String(candidate.document_id_b) : String(candidate.document_id_a);
      const { error: updateError } = await getDocumentoAdmin().from("documentos").update({ duplicate_of_id: duplicateOf, updated_by_email: user.email }).eq("id", id).is("deleted_at", null);
      if (updateError) throw new Error(updateError.message);
    }
    await getDocumentoAdmin().from("document_audit_log").insert({ document_id: id, action: `duplicate_${status}`, actor_email: user.email, after_data: { candidate_id: candidateId } });
    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("[documentos] duplicate review failed", error);
    return NextResponse.json({ error: "No se pudo actualizar el duplicado" }, { status: 500 });
  }
}
