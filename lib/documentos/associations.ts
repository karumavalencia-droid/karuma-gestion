import { getDocumentoAdmin, getDocumento, mapDocumentoRow } from "./repository";
import type { DocumentoRow } from "./types";

type Supplier = { id: number; name: string; tax_id?: string | null };

function normalizeIdentity(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(s\.?l\.?|s\.?a\.?|sl|sa|sociedad|limitada|anonima)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function tokenScore(left: string, right: string) {
  const a = new Set(normalizeIdentity(left).split(" ").filter((token) => token.length > 2));
  const b = new Set(normalizeIdentity(right).split(" ").filter((token) => token.length > 2));
  if (!a.size || !b.size) return 0;
  const shared = [...a].filter((token) => b.has(token)).length;
  return shared / Math.max(a.size, b.size);
}

function normalizeTaxId(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function canonicalPair(a: string, b: string) {
  return a < b ? [a, b] as const : [b, a] as const;
}

export async function suggestSupplierMatches(documentId: string, supplierName: string | null | undefined, supplierTaxId?: string | null) {
  const name = supplierName?.trim() || "";
  const taxId = supplierTaxId ? normalizeTaxId(supplierTaxId) : "";
  if (!name && !taxId) return { suggested: 0, autoMatched: false };
  const supabase = getDocumentoAdmin();
  const documento = await getDocumento(documentId);
  if (!documento) throw new Error("Documento no encontrado");
  const { data, error } = await supabase.from("suppliers").select("id,name,tax_id").limit(1000);
  if (error) throw new Error(error.message);
  const normalized = normalizeIdentity(name);
  const candidates = ((data || []) as Supplier[]).map((supplier) => {
    const supplierNormalized = normalizeIdentity(supplier.name);
    const exactTaxId = Boolean(taxId && supplier.tax_id && taxId === normalizeTaxId(supplier.tax_id));
    const exact = Boolean(normalized && normalized === supplierNormalized);
    const included = Boolean(normalized.length >= 5 && supplierNormalized.length >= 5 && (normalized.includes(supplierNormalized) || supplierNormalized.includes(normalized)));
    const overlap = name ? tokenScore(name, supplier.name) : 0;
    const confidence = exactTaxId ? 1 : exact ? 1 : included ? 0.9 : overlap;
    const matchMethod = exactTaxId ? "exact_tax_id" : exact ? "exact_name" : included ? "normalized_name" : "token_overlap";
    return { supplier, confidence, matchMethod };
  }).filter((candidate) => candidate.confidence >= 0.6).sort((a, b) => b.confidence - a.confidence).slice(0, 3);

  if (candidates.length) {
    const { error: insertError } = await supabase.from("document_supplier_matches").upsert(candidates.map((candidate) => ({
      document_id: documentId,
      supplier_id: candidate.supplier.id,
      candidate_name: name,
      candidate_tax_id: supplierTaxId || null,
      confidence: candidate.confidence,
      match_method: candidate.matchMethod,
      status: "suggested",
    })), { onConflict: "document_id,supplier_id", ignoreDuplicates: true });
    if (insertError) throw new Error(insertError.message);
  }

  const best = candidates[0];
  const canAutoMatch = Boolean(best && best.confidence >= 0.95 && documento.supplier_id == null && !documento.human_verified);
  if (canAutoMatch && best) {
    const { error: updateError } = await supabase.from("documentos").update({ supplier_id: best.supplier.id }).eq("id", documentId).is("deleted_at", null);
    if (updateError) throw new Error(updateError.message);
    const { error: itemUpdateError } = await supabase.from("invoice_items").update({ supplier_id: best.supplier.id }).eq("document_id", documentId);
    if (itemUpdateError) console.error("[documentos] invoice item supplier update skipped", itemUpdateError.message);
  }
  return { suggested: candidates.length, autoMatched: canAutoMatch };
}

function duplicateSignals(source: DocumentoRow, candidate: DocumentoRow) {
  const signals: Record<string, unknown> = {};
  const sameHash = Boolean(source.sha256 && source.sha256 === candidate.sha256);
  const sameInvoice = Boolean(source.invoice_number && source.invoice_number === candidate.invoice_number);
  const sameAmount = source.amount_total != null && source.amount_total === candidate.amount_total;
  const sameDate = Boolean(source.document_date && source.document_date === candidate.document_date);
  const sameSupplier = source.supplier_id != null && source.supplier_id === candidate.supplier_id;
  if (sameHash) signals.sha256 = true;
  if (sameInvoice) signals.invoice_number = source.invoice_number;
  if (sameAmount) signals.amount_total = source.amount_total;
  if (sameDate) signals.document_date = source.document_date;
  if (sameSupplier) signals.supplier_id = source.supplier_id;
  if (sameHash) return { level: "exact_duplicate", confidence: 1, signals } as const;
  if (sameInvoice && sameAmount && (sameSupplier || sameDate)) return { level: "likely_duplicate", confidence: 0.96, signals } as const;
  if (sameInvoice && (sameAmount || sameDate)) return { level: "likely_duplicate", confidence: 0.86, signals } as const;
  if (sameAmount && sameDate && (sameSupplier || source.original_filename === candidate.original_filename)) return { level: "possible_duplicate", confidence: 0.72, signals } as const;
  return null;
}

export async function detectDocumentoDuplicates(documentId: string) {
  const source = await getDocumento(documentId);
  if (!source) throw new Error("Documento no encontrado");
  const supabase = getDocumentoAdmin();
  const candidateMap = new Map<string, DocumentoRow>();
  if (source.sha256) {
    const { data, error } = await supabase.from("documentos").select("*").eq("sha256", source.sha256).neq("id", documentId).is("deleted_at", null).limit(20);
    if (error) throw new Error(error.message);
    for (const row of data || []) { const document = mapDocumentoRow(row as Record<string, unknown>); candidateMap.set(document.id, document); }
  }
  if (source.invoice_number) {
    let query = supabase.from("documentos").select("*").eq("invoice_number", source.invoice_number).neq("id", documentId).is("deleted_at", null).limit(50);
    if (source.amount_total != null) query = query.eq("amount_total", source.amount_total);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    for (const row of data || []) { const document = mapDocumentoRow(row as Record<string, unknown>); candidateMap.set(document.id, document); }
  }
  const rows = [...candidateMap.values()].flatMap((candidate) => {
    const duplicate = duplicateSignals(source, candidate);
    if (!duplicate) return [];
    const [documentIdA, documentIdB] = canonicalPair(source.id, candidate.id);
    return [{ document_id_a: documentIdA, document_id_b: documentIdB, duplicate_level: duplicate.level, confidence: duplicate.confidence, signals: duplicate.signals }];
  });
  if (rows.length) {
    const { error } = await supabase.from("document_duplicate_candidates").upsert(rows, { onConflict: "document_id_a,document_id_b", ignoreDuplicates: true });
    if (error) throw new Error(error.message);
  }
  const { error: stampError } = await supabase.from("documentos").update({ duplicate_checked_at: new Date().toISOString() }).eq("id", documentId);
  if (stampError) throw new Error(stampError.message);
  return { detected: rows.length };
}
