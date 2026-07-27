"use client";

import { useRef, useState } from "react";
import { CheckCircle2, FileUp, Loader2, RotateCcw, TriangleAlert, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type UploadPhase = "uploading" | "uploaded" | "extracting" | "needs_review" | "processed" | "failed";
type UploadItem = { key: string; name: string; phase: UploadPhase; documentId?: string; error?: string };

const phaseLabel: Record<UploadPhase, string> = {
  uploading: "Subiendo original",
  uploaded: "Original guardado",
  extracting: "Analizando con AI",
  needs_review: "Listo para revisar",
  processed: "Procesado",
  failed: "Análisis fallido",
};

function statusIcon(phase: UploadPhase) {
  if (phase === "failed") return <TriangleAlert className="h-4 w-4 text-red-300" />;
  if (phase === "needs_review" || phase === "processed") return <CheckCircle2 className="h-4 w-4 text-emerald-300" />;
  return <Loader2 className="h-4 w-4 animate-spin text-amber-300" />;
}

export function QuickAddDocumento({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [note, setNote] = useState("");
  const [items, setItems] = useState<UploadItem[]>([]);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [finished, setFinished] = useState(false);
  const [error, setError] = useState("");

  function updateItem(key: string, patch: Partial<UploadItem>) {
    setItems((current) => current.map((item) => item.key === key ? { ...item, ...patch } : item));
  }

  async function analyzeItem(key: string, documentId: string) {
    updateItem(key, { phase: "extracting", error: undefined });
    const response = await fetch(`/api/documentos/${documentId}/reprocess`, { method: "POST" });
    const body = (await response.json()) as { needsReview?: boolean; error?: string };
    if (!response.ok) throw new Error(body.error || "No se pudo analizar el archivo");
    updateItem(key, { phase: body.needsReview ? "needs_review" : "processed" });
  }

  async function submit() {
    if (finished) { onClose(); return; }
    if (files.length === 0 && !note.trim()) { setError("Añade un archivo o escribe una nota."); return; }
    setBusy(true);
    setFinished(false);
    setError("");
    const queue = files.length > 0 ? files.map((file, index) => ({ file, key: `${file.name}-${file.lastModified}-${index}`, name: file.name })) : [{ file: null, key: "quick-note", name: "Nota rápida" }];
    setItems(queue.map((entry) => ({ key: entry.key, name: entry.name, phase: "uploading" })));
    let created = 0;
    let failures = 0;
    try {
      for (const [index, entry] of queue.entries()) {
        try {
          const form = new FormData();
          if (entry.file) form.set("file", entry.file);
          if (note.trim() && queue.length === 1) form.set("note", note.trim());
          const uploadResponse = await fetch("/api/documentos", { method: "POST", body: form });
          const uploadBody = (await uploadResponse.json()) as { documento?: { id?: string }; error?: string };
          if (!uploadResponse.ok || !uploadBody.documento?.id) throw new Error(uploadBody.error || "No se pudo subir el documento");
          created += 1;
          updateItem(entry.key, { phase: "uploaded", documentId: uploadBody.documento.id });
          setProgress(Math.round(((index + 0.45) / queue.length) * 100));
          try {
            await analyzeItem(entry.key, uploadBody.documento.id);
          } catch (analysisError) {
            failures += 1;
            updateItem(entry.key, { phase: "failed", error: analysisError instanceof Error ? analysisError.message : "No se pudo analizar el archivo" });
          }
          setProgress(Math.round(((index + 1) / queue.length) * 100));
        } catch (uploadError) {
          failures += 1;
          updateItem(entry.key, { phase: "failed", error: uploadError instanceof Error ? uploadError.message : "No se pudo guardar el archivo" });
          setProgress(Math.round(((index + 1) / queue.length) * 100));
        }
      }
      if (created > 0) await onUploaded();
      if (failures) setError(`${failures} elemento(s) necesitan atención. Los originales que se guardaron siguen disponibles.`);
      setFinished(true);
    } finally {
      setBusy(false);
    }
  }

  async function retryAnalysis(item: UploadItem) {
    if (!item.documentId) return;
    setBusy(true);
    setError("");
    try {
      await analyzeItem(item.key, item.documentId);
      await onUploaded();
    } catch (analysisError) {
      updateItem(item.key, { phase: "failed", error: analysisError instanceof Error ? analysisError.message : "No se pudo analizar el archivo" });
    } finally {
      setBusy(false);
    }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"><div className="w-full max-w-lg rounded-t-2xl border border-zinc-700 bg-zinc-950 p-5 shadow-2xl sm:rounded-2xl"><div className="mb-5 flex items-start justify-between"><div><h2 className="text-lg font-semibold text-zinc-100">Añadir a Documento</h2><p className="mt-1 text-xs text-zinc-500">Guarda primero el original; la clasificación AI se puede revisar y corregir después.</p></div><button onClick={onClose} disabled={busy} className="text-zinc-500 hover:text-zinc-100" aria-label="Cerrar"><X className="h-5 w-5" /></button></div>
    {!finished ? <><div className="grid grid-cols-2 gap-2"><button onClick={() => inputRef.current?.click()} disabled={busy} className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-amber-700/60 bg-amber-500/5 text-sm text-amber-200 hover:bg-amber-500/10"><FileUp className="h-6 w-6" /> Archivos</button><label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-zinc-700 bg-zinc-900 text-sm text-zinc-300 hover:border-amber-700/60"><input className="sr-only" type="file" accept="image/*" capture="environment" disabled={busy} onChange={(event) => setFiles(event.target.files ? Array.from(event.target.files) : [])} /> Foto móvil</label></div>
    <input ref={inputRef} className="sr-only" type="file" multiple disabled={busy} onChange={(event) => setFiles(event.target.files ? Array.from(event.target.files) : [])} />
    {files.length > 0 ? <p className="mt-3 text-xs text-zinc-400">{files.length} archivo(s) preparado(s): {files.map((file) => file.name).join(", ")}</p> : null}
    <textarea value={note} onChange={(event) => setNote(event.target.value)} disabled={busy} placeholder="O escribe una nota o idea rápida…" className="mt-4 min-h-24 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-amber-600" /></> : null}
    {items.length > 0 ? <div className="mt-4 space-y-2">{items.map((item) => <div key={item.key} className="rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-xs"><div className="flex items-center justify-between gap-3"><span className="min-w-0 truncate text-zinc-200">{item.name}</span><span className="flex shrink-0 items-center gap-1.5 text-zinc-400">{statusIcon(item.phase)}{phaseLabel[item.phase]}</span></div>{item.error ? <div className="mt-2 flex items-center justify-between gap-2 text-red-200"><span>{item.error}</span>{item.documentId ? <button onClick={() => void retryAnalysis(item)} disabled={busy} className="shrink-0 rounded-md border border-red-900/70 px-2 py-1 text-red-200 hover:bg-red-950/40"><RotateCcw className="mr-1 inline h-3 w-3" />Reintentar AI</button> : null}</div> : null}</div>)}</div> : null}
    {busy && <div className="mt-4"><div className="mb-1 flex justify-between text-xs text-zinc-500"><span>Guardando y analizando…</span><span>{progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-zinc-800"><div className="h-full bg-amber-500 transition-all" style={{ width: `${progress}%` }} /></div></div>}
    {error ? <p className="mt-3 rounded-lg border border-red-900/60 bg-red-950/40 p-2 text-xs text-red-200">{error}</p> : null}
    <div className="mt-5 flex justify-end gap-2"><Button variant="outline" onClick={onClose} disabled={busy}>{finished ? "Cerrar" : "Cancelar"}</Button>{!finished ? <Button variant="warning" onClick={() => void submit()} disabled={busy} className="gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}Guardar y analizar</Button> : null}</div>
  </div></div>;
}
