"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Copy, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

type DuplicateCandidate = {
  id: string;
  duplicate_level: string;
  confidence: number;
  status: string;
  other_document?: { id: string; title: string | null; nombre: string; original_filename: string | null } | null;
};

type SupplierMatch = {
  id: string;
  supplier_id: number;
  supplier_name: string;
  confidence: number;
  match_method: string;
  status: string;
};

export function DocumentoReviewPanel({ documentId, onChanged }: { documentId: string; onChanged?: () => void }) {
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);
  const [matches, setMatches] = useState<SupplierMatch[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [duplicateResponse, matchResponse] = await Promise.all([
      fetch(`/api/documentos/${documentId}/duplicates`, { cache: "no-store" }),
      fetch(`/api/documentos/${documentId}/supplier-matches`, { cache: "no-store" }),
    ]);
    if (duplicateResponse.ok) {
      const body = await duplicateResponse.json() as { candidates?: DuplicateCandidate[] };
      setDuplicates(body.candidates || []);
    }
    if (matchResponse.ok) {
      const body = await matchResponse.json() as { matches?: SupplierMatch[] };
      setMatches(body.matches || []);
    }
  }, [documentId]);

  useEffect(() => { void load(); }, [load]);

  async function review(kind: "duplicates" | "supplier-matches", id: string, action: "confirm" | "reject") {
    setBusy(`${kind}-${id}`);
    try {
      const payload = kind === "duplicates" ? { candidateId: id, action } : { matchId: id, action };
      const response = await fetch(`/api/documentos/${documentId}/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error("No se pudo guardar la revisión");
      await load();
      onChanged?.();
    } catch {
      // The endpoint already keeps the record pending on failure; the detail remains usable.
    } finally {
      setBusy(null);
    }
  }

  const pendingDuplicates = duplicates.filter((candidate) => candidate.status === "pending");
  const pendingMatches = matches.filter((match) => match.status === "suggested");
  if (!pendingDuplicates.length && !pendingMatches.length) return null;

  return <section className="mt-5 space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4"><div><h2 className="text-sm font-semibold">Revisión pendiente</h2><p className="mt-1 text-xs text-zinc-500">Las sugerencias no modifican ni eliminan documentos hasta que las confirmes.</p></div>{pendingMatches.length > 0 && <div className="rounded-xl border border-amber-900/40 bg-amber-500/5 p-3"><p className="mb-2 text-xs font-medium text-amber-200">Proveedor sugerido</p>{pendingMatches.map((match) => <div key={match.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span>{match.supplier_name} <span className="text-xs text-zinc-500">· {Math.round(match.confidence * 100)}%</span></span><Actions busy={busy === `supplier-matches-${match.id}`} onConfirm={() => void review("supplier-matches", match.id, "confirm")} onReject={() => void review("supplier-matches", match.id, "reject")} /></div>)}</div>}{pendingDuplicates.length > 0 && <div className="rounded-xl border border-red-900/40 bg-red-950/15 p-3"><p className="mb-2 flex items-center gap-2 text-xs font-medium text-red-200"><Copy className="h-3.5 w-3.5" /> Posible duplicado</p>{pendingDuplicates.map((candidate) => <div key={candidate.id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"><span className="min-w-0">{candidate.other_document ? <Link className="text-zinc-100 hover:text-amber-300" href={`/documento/${candidate.other_document.id}`}>{candidate.other_document.title || candidate.other_document.nombre}</Link> : "Documento relacionado"} <span className="text-xs text-zinc-500">· {candidate.duplicate_level.replace("_", " ")} · {Math.round(candidate.confidence * 100)}%</span></span><Actions busy={busy === `duplicates-${candidate.id}`} onConfirm={() => void review("duplicates", candidate.id, "confirm")} onReject={() => void review("duplicates", candidate.id, "reject")} /></div>)}</div>}</section>;
}

function Actions({ busy, onConfirm, onReject }: { busy: boolean; onConfirm: () => void; onReject: () => void }) {
  return <div className="flex gap-2"><Button size="sm" variant="warning" onClick={onConfirm} disabled={busy} className="h-8 px-2 text-xs">{busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />} Confirmar</Button><Button size="sm" variant="outline" onClick={onReject} disabled={busy} className="h-8 border-zinc-700 px-2 text-xs text-zinc-300 hover:bg-zinc-900">{!busy && <X className="mr-1 h-3.5 w-3.5" />} Ignorar</Button></div>;
}
