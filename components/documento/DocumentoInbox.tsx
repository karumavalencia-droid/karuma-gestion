"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Archive, Check, FileText, Loader2, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { DocumentoRow } from "@/lib/documentos/types";

const typeLabel: Record<string, string> = {
  invoice: "Factura",
  contract: "Contrato",
  bank_receipt: "Justificante bancario",
  employee_document: "Personal",
  menu: "Menú",
  recipe: "Receta",
  image: "Imagen",
  screenshot: "Captura",
  note: "Nota",
  idea: "Idea",
  legal: "Legal",
  tax: "Fiscal",
  other: "Otro",
};

function money(value: number | null, currency: string | null) {
  if (value == null) return "—";
  const normalizedCurrency = currency?.trim().toUpperCase();
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: normalizedCurrency && /^[A-Z]{3}$/.test(normalizedCurrency) ? normalizedCurrency : "EUR",
  }).format(value);
}

export function DocumentoInbox({
  documentos,
  onChanged,
}: {
  documentos: DocumentoRow[];
  onChanged: () => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const selectableIds = useMemo(() => new Set(documentos.map((documento) => documento.id)), [documentos]);

  useEffect(() => {
    setSelected((current) => new Set([...current].filter((id) => selectableIds.has(id))));
  }, [selectableIds]);

  if (!documentos.length) return null;

  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function confirm(documentIds: string[]) {
    if (!documentIds.length) return;
    if (!window.confirm(`¿Confirmar ${documentIds.length} documento(s)? Los campos actuales pasarán a ser la fuente manual de verdad.`)) return;
    setBusy("confirm");
    setMessage("");
    try {
      const response = await fetch("/api/documentos/bulk-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentIds }),
      });
      const body = await response.json() as { confirmed?: number; error?: string };
      if (!response.ok) throw new Error(body.error || "No se pudo confirmar la selección");
      setSelected(new Set());
      setMessage(`${body.confirmed || documentIds.length} documento(s) confirmado(s).`);
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo confirmar la selección");
    } finally {
      setBusy(null);
    }
  }

  async function reprocess(id: string) {
    setBusy(`reprocess-${id}`);
    setMessage("");
    try {
      const response = await fetch(`/api/documentos/${id}/reprocess`, { method: "POST" });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "No se pudo reanalizar el documento");
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo reanalizar el documento");
    } finally {
      setBusy(null);
    }
  }

  async function archive(id: string) {
    if (!window.confirm("¿Archivar este documento? El original se conservará y la acción quedará registrada.")) return;
    setBusy(`archive-${id}`);
    setMessage("");
    try {
      const response = await fetch(`/api/documentos/${id}`, { method: "DELETE" });
      const body = await response.json() as { error?: string };
      if (!response.ok) throw new Error(body.error || "No se pudo archivar");
      await onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo archivar");
    } finally {
      setBusy(null);
    }
  }

  const allSelected = documentos.every((documento) => selected.has(documento.id));

  return (
    <section className="mb-5 rounded-2xl border border-amber-900/50 bg-zinc-950 p-4 shadow-xl sm:p-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">Bandeja de revisión</h2>
          <p className="mt-1 text-xs text-zinc-500">Confirma, corrige o reanaliza antes de usar estos datos en Analytics.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={() => setSelected(allSelected ? new Set() : new Set(documentos.map((documento) => documento.id)))}
              className="accent-amber-500"
            />
            Seleccionar todo
          </label>
          <Button
            variant="warning"
            size="sm"
            disabled={!selected.size || busy === "confirm"}
            onClick={() => void confirm([...selected])}
            className="gap-1.5"
          >
            {busy === "confirm" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            Confirmar ({selected.size})
          </Button>
        </div>
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        {documentos.map((documento) => (
          <article key={documento.id} className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
            <div className="flex gap-3">
              <input
                type="checkbox"
                checked={selected.has(documento.id)}
                onChange={() => toggle(documento.id)}
                aria-label={`Seleccionar ${documento.title || documento.nombre}`}
                className="mt-1 accent-amber-500"
              />
              <div className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 text-amber-400">
                {documento.mime_type?.startsWith("image/") ? (
                  <Image
                    src={`/api/documentos/${documento.id}/file`}
                    alt=""
                    width={64}
                    height={64}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <FileText className="h-6 w-6" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <Link href={`/documento/${documento.id}`} className="block truncate text-sm font-medium text-zinc-100 hover:text-amber-300">
                      {documento.title || documento.nombre}
                    </Link>
                    <p className="mt-1 text-xs text-zinc-500">
                      {typeLabel[documento.document_type] || documento.document_type} · {documento.status}
                    </p>
                  </div>
                  <span className="rounded-full border border-amber-900/60 bg-amber-500/10 px-2 py-1 text-[10px] text-amber-200">
                    AI {documento.ai_confidence == null ? "—" : `${Math.round(documento.ai_confidence * 100)}%`}
                  </span>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-zinc-500">
                  <span>Fecha: <strong className="font-normal text-zinc-300">{documento.document_date || "—"}</strong></span>
                  <span>Importe: <strong className="font-normal text-zinc-300">{money(documento.amount_total, documento.currency)}</strong></span>
                  <span className="col-span-2">Proveedor: <strong className="font-normal text-zinc-300">{documento.supplier_id == null ? "Sin asociar" : `#${documento.supplier_id}`}</strong></span>
                </div>
                <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-400">{documento.summary || "Sin resumen disponible."}</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap justify-end gap-2 border-t border-zinc-800 pt-3">
              <button onClick={() => void confirm([documento.id])} disabled={busy != null} className="action-button text-emerald-300"><Check className="h-3.5 w-3.5" />Confirmar</button>
              <Link href={`/documento/${documento.id}`} className="action-button text-amber-200"><Pencil className="h-3.5 w-3.5" />Modificar</Link>
              <button onClick={() => void reprocess(documento.id)} disabled={busy != null} className="action-button text-zinc-300">
                {busy === `reprocess-${documento.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}Reanalizar
              </button>
              <button onClick={() => void archive(documento.id)} disabled={busy != null} className="action-button text-red-300">
                {busy === `archive-${documento.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}Archivar
              </button>
            </div>
          </article>
        ))}
      </div>
      {message ? <p className="mt-3 text-xs text-zinc-400">{message}</p> : null}
      <style jsx>{`.action-button { display: inline-flex; min-height: 2rem; align-items: center; gap: 0.375rem; border-radius: 0.5rem; border: 1px solid rgb(63 63 70); padding: 0.375rem 0.625rem; font-size: 0.75rem; } .action-button:hover { background: rgb(24 24 27); } .action-button:disabled { opacity: 0.5; }`}</style>
    </section>
  );
}
