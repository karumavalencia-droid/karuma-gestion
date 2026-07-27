import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { isDocumentoOwner } from "@/lib/documentos/permissions";
import { getDocumentoAdmin } from "@/lib/documentos/repository";

async function authorize(request: NextRequest) {
  const user = await getSessionUser(request);
  return { user, allowed: isDocumentoOwner(user) };
}

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, allowed } = await authorize(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  const { id } = await context.params;
  try {
    const { data, error } = await getDocumentoAdmin().from("document_supplier_matches").select("*").eq("document_id", id).order("confidence", { ascending: false });
    if (error) throw new Error(error.message);
    const supplierIds = [...new Set((data || []).map((match) => Number((match as Record<string, unknown>).supplier_id)).filter(Number.isFinite))];
    const { data: suppliers, error: supplierError } = supplierIds.length ? await getDocumentoAdmin().from("suppliers").select("id,name").in("id", supplierIds) : { data: [], error: null };
    if (supplierError) throw new Error(supplierError.message);
    const names = new Map((suppliers || []).map((supplier) => [Number((supplier as Record<string, unknown>).id), String((supplier as Record<string, unknown>).name)]));
    return NextResponse.json({ matches: (data || []).map((match) => ({ ...match as Record<string, unknown>, supplier_name: names.get(Number((match as Record<string, unknown>).supplier_id)) || "Proveedor" })) }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("[documentos] supplier matches list failed", error);
    return NextResponse.json({ error: "No se pudieron cargar las sugerencias de proveedor" }, { status: 500 });
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, allowed } = await authorize(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  const { id } = await context.params;
  let body: { matchId?: unknown; action?: unknown };
  try { body = await request.json() as { matchId?: unknown; action?: unknown }; } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  const matchId = typeof body.matchId === "string" ? body.matchId : "";
  const action = body.action === "confirm" || body.action === "reject" ? body.action : null;
  if (!matchId || !action) return NextResponse.json({ error: "Acción inválida" }, { status: 400 });
  try {
    const { data: match, error: matchError } = await getDocumentoAdmin().from("document_supplier_matches").select("*").eq("id", matchId).eq("document_id", id).maybeSingle();
    if (matchError) throw new Error(matchError.message);
    if (!match) return NextResponse.json({ error: "Sugerencia no encontrada" }, { status: 404 });
    const status = action === "confirm" ? "confirmed" : "rejected";
    const { error: reviewError } = await getDocumentoAdmin().from("document_supplier_matches").update({ status, reviewed_at: new Date().toISOString(), reviewed_by_email: user.email }).eq("id", matchId);
    if (reviewError) throw new Error(reviewError.message);
    if (action === "confirm") {
      const supplierId = (match as Record<string, unknown>).supplier_id;
      const { error: updateError } = await getDocumentoAdmin().from("documentos").update({ supplier_id: supplierId, updated_by_email: user.email }).eq("id", id).is("deleted_at", null);
      if (updateError) throw new Error(updateError.message);
      const { error: itemUpdateError } = await getDocumentoAdmin().from("invoice_items").update({ supplier_id: supplierId }).eq("document_id", id);
      if (itemUpdateError) console.error("[documentos] invoice item supplier update skipped", itemUpdateError.message);
    }
    await getDocumentoAdmin().from("document_audit_log").insert({ document_id: id, action: `supplier_match_${status}`, actor_email: user.email, after_data: { match_id: matchId, supplier_id: (match as Record<string, unknown>).supplier_id } });
    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("[documentos] supplier match review failed", error);
    return NextResponse.json({ error: "No se pudo actualizar la sugerencia" }, { status: 500 });
  }
}
