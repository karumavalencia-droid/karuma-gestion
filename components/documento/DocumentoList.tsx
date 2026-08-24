"use client";

import { Archive, ExternalLink, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import Link from "next/link";
import type { DocumentoRow } from "@/lib/documentos/types";

export function DocumentoList({ documentos, onChanged }: { documentos: DocumentoRow[]; onChanged: () => Promise<void> }) {
  if (documentos.length === 0) return <div className="rounded-xl border border-dashed border-zinc-800 py-12 text-center text-sm text-zinc-500">Todavía no hay documentos en el archivo.</div>;
  return <div className="divide-y divide-zinc-800">{documentos.map((documento) => <DocumentoListItem key={documento.id} documento={documento} onChanged={onChanged} />)}</div>;
}

function DocumentoListItem({ documento, onChanged }: { documento: DocumentoRow; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  async function archive() { if (!window.confirm("¿Archivar este documento?")) return; setBusy(true); try { await fetch(`/api/documentos/${documento.id}`, { method: "DELETE" }); await onChanged(); } finally { setBusy(false); } }
  const label = documento.title || documento.nombre;
  const isInvoice = documento.document_type === "invoice";
  const amount = documento.amount_total == null ? null : documento.amount_total.toLocaleString("es-ES", { style: "currency", currency: documento.currency || "EUR" });
  return <div className="flex items-center gap-3 py-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400"><FileText className="h-5 w-5" /></div><div className="min-w-0 flex-1"><Link href={`/documento/${documento.id}`} className="block truncate text-sm font-medium text-zinc-100 hover:text-amber-300">{isInvoice ? documento.supplier_name || label : label}</Link>{isInvoice ? <><p className="mt-1 truncate text-xs text-zinc-400">{documento.invoice_number ? `Factura ${documento.invoice_number}` : label} · {documento.document_date || "fecha sin confirmar"}</p><div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300">{documento.human_verified ? "Confirmada" : "Pendiente de confirmar"}</span><span className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-300">{documento.payment_status || "Pago sin clasificar"}</span></div></> : <p className="mt-1 truncate text-xs text-zinc-500">{documento.original_filename || documento.storage_path} · {documento.status}</p>}</div><div className="shrink-0 text-right"><p className="text-sm font-semibold text-zinc-100">{amount || "—"}</p><p className="mt-1 hidden text-xs text-zinc-500 sm:block">{documento.document_date || documento.created_at.slice(0, 10)}</p></div><a href={`/api/documentos/${documento.id}/file`} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-amber-300" aria-label="Abrir archivo"><ExternalLink className="h-4 w-4" /></a><button onClick={() => void archive()} disabled={busy} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-red-300" aria-label="Archivar">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}</button></div>;
}
