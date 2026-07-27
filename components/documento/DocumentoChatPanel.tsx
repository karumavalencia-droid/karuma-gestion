"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type Source = { id: string; title: string; pageNumber: number | null; excerpt: string; href: string; amountTotal: number | null; currency: string | null };

export function DocumentoChatPanel({ onClose }: { onClose: () => void }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function ask() {
    if (!question.trim()) return;
    setLoading(true);
    setError("");
    setAnswer("");
    setSources([]);
    try {
      const response = await fetch("/api/documentos/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }) });
      const body = await response.json() as { answer?: string; sources?: Source[]; error?: string };
      if (!response.ok) throw new Error(body.error || "No se pudo consultar el archivo");
      setAnswer(body.answer || "Sin respuesta");
      setSources(body.sources || []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-6"><section className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl border border-amber-900/50 bg-zinc-950 p-4 shadow-2xl sm:rounded-2xl"><div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-amber-400" /><div><h2 className="font-semibold">Preguntar a Documento</h2><p className="text-xs text-zinc-500">Respuestas basadas en documentos recuperados y sus fuentes.</p></div></div><button onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-100" aria-label="Cerrar"><X className="h-5 w-5" /></button></div><textarea value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === "Enter") void ask(); }} placeholder="Ej.: ¿Qué facturas de Pescados Romero mencionan salmón?" className="min-h-24 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-sm text-zinc-100 outline-none focus:border-amber-600" /><div className="mt-3 flex justify-end"><Button variant="warning" onClick={() => void ask()} disabled={loading || !question.trim()}>{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Consultar</Button></div>{error && <p className="mt-3 rounded-lg bg-red-950/40 p-3 text-sm text-red-200">{error}</p>}{answer && <div className="mt-5 rounded-xl border border-amber-900/40 bg-amber-500/5 p-4 text-sm leading-6 text-zinc-100"><p>{answer}</p></div>}{sources.length > 0 && <div className="mt-5"><h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-400">Fuentes</h3><div className="space-y-2">{sources.map((source, index) => <Link key={`${source.id}-${index}`} href={source.href} className="block rounded-xl border border-zinc-800 bg-zinc-900 p-3 hover:border-amber-700/60"><div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium text-zinc-100">{index + 1}. {source.title}</span>{source.pageNumber ? <span className="shrink-0 text-xs text-amber-300">Página {source.pageNumber}</span> : null}</div>{source.excerpt && <p className="mt-1 line-clamp-2 text-xs text-zinc-500">{source.excerpt}</p>}</Link>)}</div></div>}</section></div>;
}
