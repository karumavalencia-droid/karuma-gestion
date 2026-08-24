import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { DocumentoListFilters, DocumentoRow, DocumentoStatus, DocumentoType, InvoiceItemRow } from "./types";

type UntypedSupabase = SupabaseClient;

function nullableNumber(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export function getDocumentoAdmin(): UntypedSupabase {
  const client = getSupabaseAdmin() as UntypedSupabase | null;
  if (!client) throw new Error("Supabase no está configurado");
  return client;
}

export function mapDocumentoRow(row: Record<string, unknown>): DocumentoRow {
  return {
    id: String(row.id),
    nombre: String(row.nombre ?? row.title ?? "Documento"),
    title: typeof row.title === "string" ? row.title : null,
    original_filename: typeof row.original_filename === "string" ? row.original_filename : null,
    categoria: String(row.categoria ?? "otros"),
    subcategory: typeof row.subcategory === "string" ? row.subcategory : null,
    storage_path: String(row.storage_path ?? ""),
    storage_bucket: typeof row.storage_bucket === "string" ? row.storage_bucket : "documentos",
    mime_type: typeof row.mime_type === "string" ? row.mime_type : null,
    tamano_bytes: nullableNumber(row.tamano_bytes),
    file_size: nullableNumber(row.file_size),
    document_type: String(row.document_type ?? "other") as DocumentoType,
    status: String(row.status ?? "uploaded") as DocumentoStatus,
    notas: typeof row.notas === "string" ? row.notas : null,
    summary: typeof row.summary === "string" ? row.summary : null,
    extracted_text: typeof row.extracted_text === "string" ? row.extracted_text : null,
    tags: Array.isArray(row.tags) ? row.tags.filter((tag): tag is string => typeof tag === "string") : [],
    sha256: typeof row.sha256 === "string" ? row.sha256 : null,
    human_verified: row.human_verified === true,
    invoice_items_human_verified: row.invoice_items_human_verified === true,
    document_date: typeof row.document_date === "string" ? row.document_date : null,
    uploaded_at: typeof row.uploaded_at === "string" ? row.uploaded_at : null,
    processed_at: typeof row.processed_at === "string" ? row.processed_at : null,
    source: typeof row.source === "string" ? row.source : null,
    invoice_number: typeof row.invoice_number === "string" ? row.invoice_number : null,
    amount_net: nullableNumber(row.amount_net),
    vat_amount: nullableNumber(row.vat_amount),
    amount_total: nullableNumber(row.amount_total),
    currency: typeof row.currency === "string" ? row.currency : null,
    payment_status: typeof row.payment_status === "string" ? row.payment_status : null,
    payment_date: typeof row.payment_date === "string" ? row.payment_date : null,
    legal_delivery_status: ["not_applicable", "pending", "sent", "not_required"].includes(String(row.legal_delivery_status)) ? String(row.legal_delivery_status) as "not_applicable" | "pending" | "sent" | "not_required" : "not_applicable",
    legal_sent_at: typeof row.legal_sent_at === "string" ? row.legal_sent_at : null,
    legal_sent_to: typeof row.legal_sent_to === "string" ? row.legal_sent_to : null,
    due_date: typeof row.due_date === "string" ? row.due_date : null,
    contract_start_date: typeof row.contract_start_date === "string" ? row.contract_start_date : null,
    contract_end_date: typeof row.contract_end_date === "string" ? row.contract_end_date : null,
    renewal_date: typeof row.renewal_date === "string" ? row.renewal_date : null,
    ai_confidence: nullableNumber(row.ai_confidence),
    ai_model: typeof row.ai_model === "string" ? row.ai_model : null,
    ai_processing_error: typeof row.ai_processing_error === "string" ? row.ai_processing_error : null,
    supplier_id: nullableNumber(row.supplier_id),
    supplier_name: typeof row.proveedor === "string" ? row.proveedor : null,
    created_by_email: typeof row.created_by_email === "string" ? row.created_by_email : null,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

export async function listDocumentos(filters: DocumentoListFilters = {}) {
  const supabase = getDocumentoAdmin();
  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 100);
  let query = supabase
    .from("documentos")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (filters.reviewQueue) {
    query = query.in("status", ["uploaded", "needs_review", "failed"]).eq("human_verified", false);
  } else if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.documentType) query = query.eq("document_type", filters.documentType);
  if (filters.category) query = query.eq("categoria", filters.category);
  if (filters.companyId) query = query.eq("company_id", filters.companyId);
  if (filters.restaurantId) query = query.eq("restaurant_id", filters.restaurantId);
  if (filters.supplierId != null) query = query.eq("supplier_id", filters.supplierId);
  if (filters.dateFrom) query = query.gte("document_date", filters.dateFrom);
  if (filters.dateTo) query = query.lte("document_date", filters.dateTo);
  if (filters.amountMin != null) query = query.gte("amount_total", filters.amountMin);
  if (filters.amountMax != null) query = query.lte("amount_total", filters.amountMax);
  if (filters.paymentStatus) query = query.eq("payment_status", filters.paymentStatus);
  if (filters.humanVerified != null) query = query.eq("human_verified", filters.humanVerified);
  if (filters.query) {
    const escaped = filters.query.replace(/[,%]/g, " ").trim();
    if (escaped) {
      query = query.or(
        `title.ilike.%${escaped}%,nombre.ilike.%${escaped}%,original_filename.ilike.%${escaped}%,invoice_number.ilike.%${escaped}%,extracted_text.ilike.%${escaped}%`,
      );
    }
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const { count: total, error: countError } = await supabase
    .from("documentos")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);
  if (countError) throw new Error(countError.message);

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  const { count: monthNew, error: monthError } = await supabase
    .from("documentos")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .gte("created_at", monthStart.toISOString());
  if (monthError) throw new Error(monthError.message);

  const { count: pending, error: pendingError } = await supabase
    .from("documentos")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .in("status", ["uploaded", "needs_review", "failed"]);
  if (pendingError) throw new Error(pendingError.message);

  return {
    documentos: (data ?? []).map((row) => mapDocumentoRow(row as Record<string, unknown>)),
    stats: { total: total ?? 0, monthNew: monthNew ?? 0, pending: pending ?? 0 },
  };
}

export async function getDocumento(id: string): Promise<DocumentoRow | null> {
  const { data, error } = await getDocumentoAdmin().from("documentos").select("*").eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapDocumentoRow(data as Record<string, unknown>) : null;
}

export function mapInvoiceItemRow(row: Record<string, unknown>): InvoiceItemRow {
  return {
    id: String(row.id),
    document_id: String(row.document_id),
    supplier_id: nullableNumber(row.supplier_id),
    raw_product_name: String(row.raw_product_name ?? ""),
    normalized_product_id: typeof row.normalized_product_id === "string" ? row.normalized_product_id : null,
    description: typeof row.description === "string" ? row.description : null,
    quantity: nullableNumber(row.quantity),
    unit: typeof row.unit === "string" ? row.unit : null,
    unit_price: nullableNumber(row.unit_price),
    tax_rate: nullableNumber(row.tax_rate),
    line_total: nullableNumber(row.line_total),
    human_verified: row.human_verified === true,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
    updated_by_email: typeof row.updated_by_email === "string" ? row.updated_by_email : null,
  };
}

export async function createProcessingRun(documentId: string, actorEmail: string) {
  const { data, error } = await getDocumentoAdmin()
    .from("document_processing_runs")
    .insert({ document_id: documentId, stage: "upload", status: "completed", finished_at: new Date().toISOString(), error_message: null })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  await getDocumentoAdmin().from("document_audit_log").insert({ document_id: documentId, action: "created", actor_email: actorEmail, after_data: { source: "manual_upload" } });
  return data;
}
