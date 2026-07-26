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
  return <div className="flex items-center gap-3 py-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400"><FileText className="h-5 w-5" /></div><div className="min-w-0 flex-1"><Link href={`/documento/${documento.id}`} className="truncate text-sm font-medium text-zinc-100 hover:text-amber-300">{label}</Link><p className="mt-1 truncate text-xs text-zinc-500">{documento.original_filename || documento.storage_path} · {documento.status}</p></div><div className="hidden text-right text-xs text-zinc-500 sm:block">{documento.mime_type || "archivo"}<br />{documento.created_at.slice(0, 10)}</div><a href={`/api/documentos/${documento.id}/file`} target="_blank" rel="noreferrer" className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-amber-300" aria-label="Abrir archivo"><ExternalLink className="h-4 w-4" /></a><button onClick={() => void archive()} disabled={busy} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-red-300" aria-label="Archivar">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}</button></div>;
}
