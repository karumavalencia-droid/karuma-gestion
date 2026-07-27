"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, FileText, Loader2, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { DocumentoRow, DocumentoType, InvoiceItemRow } from "@/lib/documentos/types";
import { DocumentoReviewPanel } from "./DocumentoReviewPanel";
import { InvoiceItemsEditor } from "./InvoiceItemsEditor";

type DocumentoHistory = {
  processingRuns: Array<{
    id: string;
    stage: string;
    status: string;
    attempt: number;
    model?: string | null;
    error_message?: string | null;
    started_at?: string | null;
    finished_at?: string | null;
    created_at: string;
  }>;
  changes: Array<{
    id: string;
    action: string;
    actor_email?: string | null;
    created_at: string;
  }>;
  available: boolean;
};

type EditableForm = {
  title: string;
  notes: string;
  summary: string;
  extractedText: string;
  tags: string;
  documentType: DocumentoType;
  documentDate: string;
  invoiceNumber: string;
  amountNet: string;
  vatAmount: string;
  amountTotal: string;
  currency: string;
  dueDate: string;
  paymentStatus: string;
  legalStatus: string;
  legalSentTo: string;
  verified: boolean;
};

const documentTypes: Array<{ value: DocumentoType; label: string }> = [
  { value: "invoice", label: "Factura" },
  { value: "contract", label: "Contrato" },
  { value: "bank_receipt", label: "Justificante bancario" },
  { value: "employee_document", label: "Documento de personal" },
  { value: "menu", label: "Menú" },
  { value: "recipe", label: "Receta" },
  { value: "image", label: "Imagen" },
  { value: "screenshot", label: "Captura" },
  { value: "note", label: "Nota" },
  { value: "idea", label: "Idea" },
  { value: "legal", label: "Legal" },
  { value: "tax", label: "Fiscal" },
  { value: "other", label: "Otro" },
];

function formFromDocumento(documento: DocumentoRow): EditableForm {
  return {
    title: documento.title || documento.nombre,
    notes: documento.notas || "",
    summary: documento.summary || "",
    extractedText: documento.extracted_text || "",
    tags: documento.tags.join(", "),
    documentType: documento.document_type,
    documentDate: documento.document_date || "",
    invoiceNumber: documento.invoice_number || "",
    amountNet: documento.amount_net == null ? "" : String(documento.amount_net),
    vatAmount: documento.vat_amount == null ? "" : String(documento.vat_amount),
    amountTotal: documento.amount_total == null ? "" : String(documento.amount_total),
    currency: documento.currency || "EUR",
    dueDate: documento.due_date || "",
    paymentStatus: documento.payment_status || "",
    legalStatus: documento.legal_delivery_status || "not_applicable",
    legalSentTo: documento.legal_sent_to || "",
    verified: documento.human_verified,
  };
}

function dateTime(value?: string | null) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short" }).format(parsed);
}

function isPreviewable(mimeType: string | null) {
  return Boolean(mimeType?.startsWith("image/") || mimeType === "application/pdf" || mimeType?.startsWith("text/"));
}

export function DocumentoDetail({ id }: { id: string }) {
  const [documento, setDocumento] = useState<DocumentoRow | null>(null);
  const [form, setForm] = useState<EditableForm | null>(null);
  const [history, setHistory] = useState<DocumentoHistory>({ processingRuns: [], changes: [], available: false });
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItemRow[]>([]);
  const [invoiceItemsAvailable, setInvoiceItemsAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/documentos/${id}`, { cache: "no-store" });
      const body = (await response.json()) as {
        documento?: DocumentoRow;
        history?: DocumentoHistory;
        invoiceItems?: InvoiceItemRow[];
        invoiceItemsAvailable?: boolean;
        error?: string;
      };
      if (!response.ok || !body.documento) throw new Error(body.error || "No se pudo cargar el documento");
      setDocumento(body.documento);
      setForm(formFromDocumento(body.documento));
      setHistory(body.history || { processingRuns: [], changes: [], available: false });
      setInvoiceItems(body.invoiceItems || []);
      setInvoiceItemsAvailable(body.invoiceItemsAvailable === true);
      setMessage("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar el documento");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function updateField<Key extends keyof EditableForm>(key: Key, value: EditableForm[Key]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/documentos/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          notas: form.notes,
          summary: form.summary,
          extracted_text: form.extractedText,
          tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
          document_type: form.documentType,
          document_date: form.documentDate || null,
          invoice_number: form.invoiceNumber,
          amount_net: form.amountNet,
          vat_amount: form.vatAmount,
          amount_total: form.amountTotal,
          currency: form.currency,
          due_date: form.dueDate || null,
          payment_status: form.paymentStatus,
          legal_delivery_status: form.legalStatus,
          legal_sent_to: form.legalSentTo,
          human_verified: form.verified,
        }),
      });
      const body = (await response.json()) as { documento?: DocumentoRow; error?: string };
      if (!response.ok || !body.documento) throw new Error(body.error || "No se pudo guardar");
      setDocumento(body.documento);
      setForm(formFromDocumento(body.documento));
      setMessage(form.verified ? "Cambios guardados y confirmados manualmente." : "Cambios guardados: sigue pendiente de confirmación.");
      void load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  async function reprocess() {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/documentos/${id}/reprocess`, { method: "POST" });
      const body = (await response.json()) as { documento?: DocumentoRow; needsReview?: boolean; error?: string };
      if (!response.ok || !body.documento) throw new Error(body.error || "No se pudo analizar");
      setDocumento(body.documento);
      setForm(formFromDocumento(body.documento));
      setMessage(body.needsReview ? "Análisis completado: revisa y confirma los campos AI." : "Análisis actualizado. Los campos confirmados manualmente se han conservado.");
      void load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Error de análisis");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-[#0a0a0a] p-6 text-zinc-500"><Loader2 className="h-5 w-5 animate-spin" /></div>;
  }
  if (!documento || !form) {
    return <div className="min-h-screen bg-[#0a0a0a] p-6 text-red-200">{message || "Documento no encontrado"}</div>;
  }

  const privateFileUrl = `/api/documentos/${documento.id}/file`;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      <div className="mx-auto max-w-6xl px-4 py-6">
        <Link href="/documento" className="mb-6 inline-flex items-center gap-2 text-sm text-amber-400">
          <ArrowLeft className="h-4 w-4" /> Volver a Documento
        </Link>

        <div className="mb-5 flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400"><FileText className="h-6 w-6" /></div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">{documento.title || documento.nombre}</h1>
            <p className="mt-1 text-xs text-zinc-500">{documento.original_filename || "Sin nombre original"} · {documento.status}{documento.human_verified ? " · confirmado" : " · por revisar"}</p>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold">Original privado</h2>
              <a href={privateFileUrl} target="_blank" rel="noreferrer" className="rounded-lg bg-amber-500 px-3 py-2 text-xs font-medium text-black hover:bg-amber-400">Abrir / descargar</a>
            </div>
            {isPreviewable(documento.mime_type) ? (
              <iframe title={`Vista previa de ${documento.title || documento.nombre}`} src={privateFileUrl} className="h-[420px] w-full rounded-xl border border-zinc-800 bg-zinc-900" />
            ) : (
              <div className="flex min-h-72 items-center justify-center rounded-xl border border-dashed border-zinc-800 bg-zinc-900 px-6 text-center text-sm text-zinc-500">La vista previa no está disponible para este formato. El original sigue disponible mediante el enlace privado.</div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-500">
              <p>Tipo<br /><span className="text-zinc-200">{documento.mime_type || "—"}</span></p>
              <p>Tamaño<br /><span className="text-zinc-200">{documento.file_size == null ? "—" : `${Math.round(documento.file_size / 1024)} KB`}</span></p>
              <p>Hash<br /><span className="break-all text-zinc-200">{documento.sha256 || "—"}</span></p>
              <p>Origen<br /><span className="text-zinc-200">{documento.source || "—"}</span></p>
            </div>
            {documento.ai_processing_error ? <p className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-xs text-red-200">Error AI: {documento.ai_processing_error}</p> : null}
          </section>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <h2 className="mb-4 text-sm font-semibold">Revisión y campos estructurados</h2>
            <label className="mb-3 block text-xs text-zinc-500">Título
              <input value={form.title} onChange={(event) => updateField("title", event.target.value)} className="input-dark" />
            </label>
            <div className="mb-3 grid grid-cols-2 gap-3">
              <label className="block text-xs text-zinc-500">Tipo
                <select value={form.documentType} onChange={(event) => updateField("documentType", event.target.value as DocumentoType)} className="input-dark">
                  {documentTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
                </select>
              </label>
              <label className="block text-xs text-zinc-500">Fecha documento
                <input type="date" value={form.documentDate} onChange={(event) => updateField("documentDate", event.target.value)} className="input-dark" />
              </label>
            </div>
            <details className="mb-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-3" open={form.documentType === "invoice"}>
              <summary className="cursor-pointer text-xs font-medium text-amber-200">Datos de factura / pago</summary>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="col-span-2 text-xs text-zinc-500">Número de factura
                  <input value={form.invoiceNumber} onChange={(event) => updateField("invoiceNumber", event.target.value)} className="input-dark" />
                </label>
                <label className="text-xs text-zinc-500">Neto
                  <input inputMode="decimal" value={form.amountNet} onChange={(event) => updateField("amountNet", event.target.value)} className="input-dark" />
                </label>
                <label className="text-xs text-zinc-500">IVA
                  <input inputMode="decimal" value={form.vatAmount} onChange={(event) => updateField("vatAmount", event.target.value)} className="input-dark" />
                </label>
                <label className="text-xs text-zinc-500">Total
                  <input inputMode="decimal" value={form.amountTotal} onChange={(event) => updateField("amountTotal", event.target.value)} className="input-dark" />
                </label>
                <label className="text-xs text-zinc-500">Moneda
                  <input value={form.currency} onChange={(event) => updateField("currency", event.target.value)} className="input-dark" />
                </label>
                <label className="text-xs text-zinc-500">Vencimiento
                  <input type="date" value={form.dueDate} onChange={(event) => updateField("dueDate", event.target.value)} className="input-dark" />
                </label>
                <label className="text-xs text-zinc-500">Estado de pago
                  <select value={form.paymentStatus} onChange={(event) => updateField("paymentStatus", event.target.value)} className="input-dark">
                    <option value="">Sin indicar</option><option value="pending">Pendiente</option><option value="paid">Pagada</option><option value="due">Vencida</option><option value="unpaid">Sin pagar</option>
                  </select>
                </label>
              </div>
            </details>
            <label className="mb-3 block text-xs text-zinc-500">Resumen AI / manual
              <textarea value={form.summary} onChange={(event) => updateField("summary", event.target.value)} className="input-dark min-h-20" />
            </label>
            <label className="mb-3 block text-xs text-zinc-500">Etiquetas (separadas por coma)
              <input value={form.tags} onChange={(event) => updateField("tags", event.target.value)} className="input-dark" />
            </label>
            <label className="mb-3 block text-xs text-zinc-500">Notas
              <textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} className="input-dark min-h-20" />
            </label>
            <label className="mb-3 block text-xs text-zinc-500">Texto extraído
              <textarea value={form.extractedText} onChange={(event) => updateField("extractedText", event.target.value)} className="input-dark min-h-28" />
            </label>
            <label className="mb-3 block text-xs text-zinc-500">Entrega a abogado
              <select value={form.legalStatus} onChange={(event) => updateField("legalStatus", event.target.value)} className="input-dark">
                <option value="not_applicable">No aplica</option><option value="pending">Pendiente de enviar</option><option value="sent">Enviado</option><option value="not_required">No requerido</option>
              </select>
            </label>
            {form.legalStatus === "sent" ? <label className="mb-3 block text-xs text-zinc-500">Enviado a
              <input value={form.legalSentTo} onChange={(event) => updateField("legalSentTo", event.target.value)} placeholder="correo@asesoria.es" className="input-dark" />
            </label> : null}
            <label className="mb-4 flex items-start gap-2 text-xs text-zinc-300">
              <input type="checkbox" checked={form.verified} onChange={(event) => updateField("verified", event.target.checked)} className="mt-0.5 accent-amber-500" />
              <span><Check className="mr-1 inline h-4 w-4 text-amber-400" />Confirmado manualmente. Una nueva reanalización no sustituirá estos campos ni sus líneas de factura.</span>
            </label>
            <div className="space-y-2">
              <Button variant="warning" onClick={() => void save()} disabled={saving} className="w-full gap-2">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar cambios</Button>
              <Button onClick={() => void reprocess()} disabled={saving} variant="outline" className="w-full gap-2 border-amber-800/60 text-amber-200 hover:bg-amber-500/10">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Reanalizar con AI</Button>
            </div>
            {message ? <p className="mt-3 text-xs text-zinc-400">{message}</p> : null}
          </section>
        </div>

        {documento.document_type === "invoice" ? (
          <InvoiceItemsEditor
            documentId={documento.id}
            items={invoiceItems}
            available={invoiceItemsAvailable}
            humanVerified={documento.invoice_items_human_verified || documento.human_verified}
            currency={documento.currency}
            onSaved={load}
          />
        ) : null}

        <DocumentoReviewPanel documentId={documento.id} onChanged={() => { void load(); }} />

        <section className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
          <h2 className="text-sm font-semibold">Historial</h2>
          {!history.available ? <p className="mt-2 text-xs text-zinc-500">El historial estará disponible cuando se aplique la migration de Documento.</p> : null}
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            <div><p className="mb-2 text-xs font-medium text-amber-200">Procesamiento</p>{history.processingRuns.length ? <div className="space-y-2">{history.processingRuns.map((run) => <div key={run.id} className="rounded-lg bg-zinc-900 p-2 text-xs"><p className="text-zinc-200">{run.stage} · {run.status} · intento {run.attempt}</p><p className="mt-1 text-zinc-500">{dateTime(run.finished_at || run.started_at || run.created_at)}{run.model ? ` · ${run.model}` : ""}</p>{run.error_message ? <p className="mt-1 text-red-300">{run.error_message}</p> : null}</div>)}</div> : <p className="text-xs text-zinc-500">Sin ejecuciones registradas.</p>}</div>
            <div><p className="mb-2 text-xs font-medium text-amber-200">Cambios</p>{history.changes.length ? <div className="space-y-2">{history.changes.map((change) => <div key={change.id} className="rounded-lg bg-zinc-900 p-2 text-xs"><p className="text-zinc-200">{change.action}</p><p className="mt-1 text-zinc-500">{dateTime(change.created_at)}{change.actor_email ? ` · ${change.actor_email}` : ""}</p></div>)}</div> : <p className="text-xs text-zinc-500">Sin cambios registrados.</p>}</div>
          </div>
        </section>
      </div>
      <style jsx>{`.input-dark { margin-top: 0.25rem; width: 100%; border-radius: 0.5rem; border: 1px solid rgb(39 39 42); background: rgb(24 24 27); padding: 0.5rem 0.75rem; color: rgb(244 244 245); font-size: 0.875rem; outline: none; } .input-dark:focus { border-color: rgb(217 119 6); }`}</style>
    </div>
  );
}
