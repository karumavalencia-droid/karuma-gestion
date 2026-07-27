import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { analyzeDocumento, DOCUMENT_AI_MODEL } from "@/lib/documentos/ai";
import { isDocumentoOwner } from "@/lib/documentos/permissions";
import { getDocumento, getDocumentoAdmin, mapDocumentoRow } from "@/lib/documentos/repository";
import { DOCUMENTO_BUCKET } from "@/lib/documentos/types";
import { rebuildDocumentoChunks } from "@/lib/documentos/chunks";
import { detectDocumentoDuplicates, suggestSupplierMatches } from "@/lib/documentos/associations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (!isDocumentoOwner(user)) return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  const { id } = await context.params;
  const documento = await getDocumento(id);
  if (!documento) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const supabase = getDocumentoAdmin();
  const startedAt = new Date().toISOString();
  const { data: run, error: runError } = await supabase.from("document_processing_runs").insert({ document_id: id, stage: "ai_analysis", status: "running", attempt: 1, model: DOCUMENT_AI_MODEL, started_at: startedAt }).select("id").single();
  if (runError) return NextResponse.json({ error: "La migration de procesamiento todavía no está aplicada" }, { status: 503 });
  if (!documento.human_verified) {
    const { error: statusError } = await supabase.from("documentos").update({ status: "extracting", ai_processing_error: null }).eq("id", id).is("deleted_at", null);
    if (statusError) console.error("[documentos] processing status update failed", statusError.message);
  }

  try {
    const { data: file, error: downloadError } = await supabase.storage.from(documento.storage_bucket || DOCUMENTO_BUCKET).download(documento.storage_path);
    if (downloadError || !file) throw new Error(downloadError?.message || "No se pudo descargar el original");
    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await analyzeDocumento({ filename: documento.original_filename || documento.nombre, mimeType: documento.mime_type || "application/octet-stream", bytes, notes: documento.notas });
    const invoice = result.invoice;
    // A confirmed record is the owner's source of truth. Reanalysis may refresh
    // AI-only diagnostics, but must never silently replace confirmed fields or
    // invoice lines with a new model interpretation.
    const update: Record<string, unknown> = {
      ai_description: result.description || null,
      ai_confidence: result.confidence,
      ai_model: DOCUMENT_AI_MODEL,
      ai_processing_error: null,
      processed_at: new Date().toISOString(),
    };
    if (!documento.human_verified) {
      Object.assign(update, {
        document_type: result.documentType,
        status: "needs_review",
        summary: result.summary || null,
        extracted_text: result.extractedText || null,
        tags: result.tags,
        invoice_number: invoice?.invoiceNumber || null,
        document_date: invoice?.documentDate || null,
        due_date: invoice?.dueDate || null,
        amount_net: invoice?.amountNet ?? null,
        vat_amount: invoice?.vatAmount ?? null,
        amount_total: invoice?.amountTotal ?? null,
        currency: invoice?.currency || null,
      });
    }
    const { data: updated, error: updateError } = await supabase.from("documentos").update(update).eq("id", id).select("*").single();
    if (updateError || !updated) throw new Error(updateError?.message || "No se pudo guardar el resultado AI");
    if (!documento.human_verified && !documento.invoice_items_human_verified && invoice?.items) {
      await supabase.from("invoice_items").delete().eq("document_id", id);
      if (invoice.items.length) {
        const { error: itemsError } = await supabase.from("invoice_items").insert(invoice.items.map((item) => ({ document_id: id, supplier_id: documento.supplier_id, raw_product_name: item.rawProductName, description: item.description || null, quantity: item.quantity ?? null, unit: item.unit || null, unit_price: item.unitPrice ?? null, tax_rate: item.taxRate ?? null, line_total: item.lineTotal ?? null })));
        if (itemsError) console.error("[documentos] invoice items failed", itemsError.message);
      }
    }
    try {
      await rebuildDocumentoChunks(id, documento.human_verified ? documento.extracted_text || "" : result.extractedText);
    } catch (chunksError) {
      // Chunk indexing is additive: an unavailable Phase 3 migration must not lose a valid AI result.
      console.error("[documentos] chunk indexing skipped", chunksError instanceof Error ? chunksError.message : chunksError);
    }
    try {
      await suggestSupplierMatches(id, invoice?.supplierName, invoice?.supplierTaxId);
    } catch (supplierError) {
      // Low-confidence matches stay reviewable; failure must not invalidate extraction.
      console.error("[documentos] supplier matching skipped", supplierError instanceof Error ? supplierError.message : supplierError);
    }
    try {
      await detectDocumentoDuplicates(id);
    } catch (duplicateError) {
      console.error("[documentos] duplicate detection skipped", duplicateError instanceof Error ? duplicateError.message : duplicateError);
    }
    await supabase.from("document_processing_runs").update({ status: "completed", finished_at: new Date().toISOString() }).eq("id", run.id);
    await supabase.from("document_audit_log").insert({ document_id: id, action: documento.human_verified ? "ai_reprocessed_preserving_verified" : "ai_processed", actor_email: user.email, after_data: { status: documento.human_verified ? documento.status : "needs_review", confidence: result.confidence, model: DOCUMENT_AI_MODEL, preservedHumanVerifiedFields: documento.human_verified, preservedHumanVerifiedInvoiceItems: documento.invoice_items_human_verified } });
    return NextResponse.json({ documento: mapDocumentoRow(updated as Record<string, unknown>), needsReview: !documento.human_verified }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI processing failed";
    await supabase.from("documentos").update(documento.human_verified ? { ai_processing_error: message.slice(0, 2000) } : { status: "failed", ai_processing_error: message.slice(0, 2000) }).eq("id", id);
    await supabase.from("document_processing_runs").update({ status: "failed", error_message: message.slice(0, 2000), finished_at: new Date().toISOString() }).eq("id", run.id);
    console.error("[documentos] AI processing failed", { id, error: message });
    return NextResponse.json({ error: "No se pudo analizar el documento" }, { status: 502 });
  }
}
