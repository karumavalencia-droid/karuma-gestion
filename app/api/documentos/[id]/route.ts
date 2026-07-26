import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { isDocumentoOwner } from "@/lib/documentos/permissions";
import { getDocumento, getDocumentoAdmin, mapDocumentoRow, mapInvoiceItemRow } from "@/lib/documentos/repository";
import { isDocumentoStatus, isDocumentoType } from "@/lib/documentos/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    const documento = await getDocumento(id);
    if (!documento) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
    const supabase = getDocumentoAdmin();
    const [runs, changes, invoiceItems] = await Promise.all([
      supabase.from("document_processing_runs").select("id,stage,status,attempt,model,error_message,started_at,finished_at,created_at").eq("document_id", id).order("created_at", { ascending: false }).limit(20),
      supabase.from("document_audit_log").select("id,action,actor_email,created_at,before_data,after_data").eq("document_id", id).order("created_at", { ascending: false }).limit(30),
      supabase.from("invoice_items").select("*").eq("document_id", id).order("created_at", { ascending: true }).limit(200),
    ]);
    return NextResponse.json({
      documento,
      history: {
        processingRuns: runs.error ? [] : runs.data || [],
        changes: changes.error ? [] : changes.data || [],
        available: !runs.error && !changes.error,
      },
      invoiceItems: invoiceItems.error
        ? []
        : (invoiceItems.data || []).map((row) => mapInvoiceItemRow(row as Record<string, unknown>)),
      invoiceItemsAvailable: !invoiceItems.error,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[documentos] detail failed", error);
    return NextResponse.json({ error: "No se pudo cargar el documento" }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, allowed } = await authorize(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  const { id } = await context.params;
  const before = await getDocumento(id);
  if (!before) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  let body: Record<string, unknown>;
  try { body = (await request.json()) as Record<string, unknown>; } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }

  const update: Record<string, unknown> = { updated_by_email: user.email };
  if (typeof body.title === "string" && body.title.trim()) { update.title = body.title.trim().slice(0, 240); update.nombre = update.title; }
  if (typeof body.notas === "string") update.notas = body.notas.slice(0, 20_000);
  if (typeof body.summary === "string") update.summary = body.summary.slice(0, 4_000);
  if (typeof body.extracted_text === "string") update.extracted_text = body.extracted_text.slice(0, 500_000);
  if (Array.isArray(body.tags) && body.tags.every((tag) => typeof tag === "string")) update.tags = body.tags.slice(0, 50).map((tag) => tag.trim()).filter(Boolean);
  if (isDocumentoType(body.document_type)) update.document_type = body.document_type;
  if (isDocumentoStatus(body.status)) update.status = body.status;
  if (typeof body.human_verified === "boolean") {
    update.human_verified = body.human_verified;
    if (!isDocumentoStatus(body.status)) update.status = body.human_verified ? "processed" : "needs_review";
  }
  if (body.document_date === null || body.document_date === "") update.document_date = null;
  else if (typeof body.document_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.document_date)) update.document_date = body.document_date;
  if (body.due_date === null || body.due_date === "") update.due_date = null;
  else if (typeof body.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.due_date)) update.due_date = body.due_date;
  if (typeof body.invoice_number === "string") update.invoice_number = body.invoice_number.trim().slice(0, 200) || null;
  if (typeof body.currency === "string") update.currency = body.currency.trim().toUpperCase().slice(0, 10) || null;
  if (typeof body.payment_status === "string") update.payment_status = body.payment_status.trim().slice(0, 80) || null;
  for (const field of ["amount_net", "vat_amount", "amount_total"] as const) {
    const value = body[field];
    if (value === null || value === "") update[field] = null;
    else if (typeof value === "number" && Number.isFinite(value)) update[field] = value;
    else if (typeof value === "string" && value.trim() && Number.isFinite(Number(value))) update[field] = Number(value);
  }
  if (["not_applicable", "pending", "sent", "not_required"].includes(String(body.legal_delivery_status))) {
    update.legal_delivery_status = body.legal_delivery_status;
    if (body.legal_delivery_status === "sent") update.legal_sent_at = new Date().toISOString();
  }
  if (typeof body.legal_sent_to === "string") update.legal_sent_to = body.legal_sent_to.trim().slice(0, 320) || null;
  if (Object.keys(update).length === 1) return NextResponse.json({ error: "No hay cambios válidos" }, { status: 400 });

  try {
    const { data, error } = await getDocumentoAdmin().from("documentos").update(update).eq("id", id).is("deleted_at", null).select("*").single();
    if (error || !data) throw new Error(error?.message ?? "No se pudo actualizar");
    const { error: auditError } = await getDocumentoAdmin().from("document_audit_log").insert({ document_id: id, action: "updated", actor_email: user.email, before_data: before, after_data: data });
    if (auditError) console.error("[documentos] audit insert failed", auditError.message);
    return NextResponse.json({ documento: mapDocumentoRow(data as Record<string, unknown>) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[documentos] update failed", error);
    return NextResponse.json({ error: "No se pudo actualizar el documento" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { user, allowed } = await authorize(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!allowed) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  const { id } = await context.params;
  const { data, error } = await getDocumentoAdmin().from("documentos").update({ deleted_at: new Date().toISOString(), status: "archived", updated_by_email: user.email }).eq("id", id).is("deleted_at", null).select("id").maybeSingle();
  if (error) { console.error("[documentos] archive failed", error.message); return NextResponse.json({ error: "No se pudo archivar" }, { status: 500 }); }
  if (!data) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });
  const { error: auditError } = await getDocumentoAdmin().from("document_audit_log").insert({ document_id: id, action: "archived", actor_email: user.email });
  if (auditError) console.error("[documentos] archive audit failed", auditError.message);
  return NextResponse.json({ success: true });
}
