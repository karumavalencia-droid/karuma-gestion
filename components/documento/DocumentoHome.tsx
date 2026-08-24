"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, Camera, FileUp, FolderOpen, Lightbulb, Loader2, Mail, Mic, Search, ShieldCheck, Sparkles, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { DocumentoList } from "./DocumentoList";
import { DocumentoInbox } from "./DocumentoInbox";
import { QuickAddDocumento } from "./QuickAddDocumento";
import { DocumentoChatPanel } from "./DocumentoChatPanel";
import type { DocumentoListResponse } from "@/lib/documentos/types";

const categories = [
  ["invoice", "Facturas"], ["contract", "Contratos"], ["bank_receipt", "Bancos"],
  ["employee_document", "Personal"], ["menu", "Menús y recetas"], ["image", "Imágenes"],
  ["idea", "Ideas y notas"], ["legal", "Abogados y fiscal"],
] as const;

type DocumentoAlerts = {
  invoicesTotal: number;
  invoiceTotalAmount: number;
  unpaidInvoices: number;
  paymentStatusMissing: number;
  unverifiedInvoices: number;
  expiringContracts: number;
  duplicateCandidates: number;
  legalPending: number;
  aiFailures: number;
};

export function DocumentoHome() {
  const [data, setData] = useState<DocumentoListResponse>({ documentos: [], stats: { pending: 0, monthNew: 0, total: 0 } });
  const [inbox, setInbox] = useState<DocumentoListResponse["documentos"]>([]);
  const [alerts, setAlerts] = useState<DocumentoAlerts>({ invoicesTotal: 0, invoiceTotalAmount: 0, unpaidInvoices: 0, paymentStatusMissing: 0, unverifiedInvoices: 0, expiringContracts: 0, duplicateCandidates: 0, legalPending: 0, aiFailures: 0 });
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [category, setCategory] = useState<string | undefined>();
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [verifiedFilter, setVerifiedFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [amountMin, setAmountMin] = useState("");
  const [amountMax, setAmountMax] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [chatOpen, setChatOpen] = useState(false);
  const [gmailBusy, setGmailBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (category) params.set("type", category);
    if (statusFilter) params.set("status", statusFilter);
    if (paymentFilter) params.set("paymentStatus", paymentFilter);
    if (verifiedFilter) params.set("humanVerified", verifiedFilter);
    if (dateFrom) params.set("dateFrom", dateFrom);
    if (dateTo) params.set("dateTo", dateTo);
    if (amountMin) params.set("amountMin", amountMin);
    if (amountMax) params.set("amountMax", amountMax);
    if (supplierId) params.set("supplierId", supplierId);
    try {
      const [response, alertsResponse, inboxResponse] = await Promise.all([
        fetch(`/api/documentos?${params.toString()}`, { cache: "no-store" }),
        fetch("/api/documentos/alerts", { cache: "no-store" }),
        fetch("/api/documentos?reviewQueue=true&limit=50", { cache: "no-store" }),
      ]);
      const body = (await response.json()) as DocumentoListResponse & { error?: string };
      if (!response.ok) throw new Error(body.error || "No se pudieron cargar los documentos");
      setData(body);
      if (alertsResponse.ok) setAlerts(await alertsResponse.json() as DocumentoAlerts);
      if (inboxResponse.ok) {
        const inboxBody = await inboxResponse.json() as DocumentoListResponse;
        setInbox(inboxBody.documentos || []);
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  }, [amountMax, amountMin, category, dateFrom, dateTo, paymentFilter, query, statusFilter, supplierId, verifiedFilter]);

  useEffect(() => { void load(); }, [load]);

  function showCategory(nextCategory: string) {
    setCategory(nextCategory);
    window.setTimeout(() => document.getElementById("documento-archive")?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  }

  async function importGmail() {
    if (!window.confirm("¿Sincronizar las facturas de Gmail y de la carpeta Drive de Kosushi? Se omitirán los archivos ya importados.")) return;
    setGmailBusy(true);
    setError("");
    setNotice("");
    try {
      const [gmailResponse, driveResponse] = await Promise.all([
        fetch("/api/documentos/gmail/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: "has:attachment -in:spam -in:trash newer_than:2y {factura invoice albaran recibo}", limit: 100 }) }),
        fetch("/api/documentos/drive/import", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ limit: 200 }) }),
      ]);
      const gmail = await gmailResponse.json() as { imported?: number; skipped?: number; failed?: number; error?: string };
      const drive = await driveResponse.json() as { imported?: number; skipped?: number; failed?: number; error?: string };
      if (!gmailResponse.ok && !driveResponse.ok) throw new Error(`${gmail.error || "Gmail falló"}; ${drive.error || "Drive falló"}`);
      setNotice(`Sincronización: Gmail ${gmail.imported || 0} nuevo(s), Drive ${drive.imported || 0} nuevo(s); ${(gmail.skipped || 0) + (drive.skipped || 0)} duplicado(s)/omitido(s); ${(gmail.failed || 0) + (drive.failed || 0)} error(es).${!gmailResponse.ok ? ` Gmail: ${gmail.error}` : ""}${!driveResponse.ok ? ` Drive: ${drive.error}` : ""}`);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Error al importar Gmail");
    } finally {
      setGmailBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <PageHeader title="Documento" description="El archivo vivo de Karuma: documentos, decisiones y memoria operativa." />

        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-amber-900/40 bg-zinc-950 p-4 shadow-2xl sm:flex-row sm:items-center">
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5">
            <Search className="h-5 w-5 shrink-0 text-amber-400" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void load(); }} placeholder="Busca archivos, facturas, contratos, ideas…" className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-500" />
          </div>
          <Button variant="warning" onClick={() => setQuickAddOpen(true)} className="gap-2"><FileUp className="h-4 w-4" /> Añadir contenido</Button>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          <Metric label="Pendientes" value={data.stats.pending} icon={<Loader2 className="h-4 w-4" />} />
          <Metric label="Nuevos este mes" value={data.stats.monthNew} icon={<Sparkles className="h-4 w-4" />} />
          <Metric label="Facturas" value={alerts.invoicesTotal} icon={<FolderOpen className="h-4 w-4" />} onClick={() => showCategory("invoice")} />
          <Metric label="Pago sin clasificar" value={alerts.paymentStatusMissing} icon={<Loader2 className="h-4 w-4" />} onClick={() => showCategory("invoice")} />
          <Metric label="Contratos próximos" value={alerts.expiringContracts} icon={<Archive className="h-4 w-4" />} />
          <Metric label="Posibles duplicados" value={alerts.duplicateCandidates} icon={<Search className="h-4 w-4" />} />
          <Metric label="Pendiente abogado" value={alerts.legalPending} icon={<ShieldCheck className="h-4 w-4" />} />
          <Metric label="Fallos AI" value={alerts.aiFailures} icon={<Loader2 className="h-4 w-4" />} />
        </div>

        {alerts.invoicesTotal > 0 && (
          <button onClick={() => showCategory("invoice")} className="mb-6 flex w-full items-center justify-between gap-4 rounded-2xl border border-amber-900/40 bg-amber-500/10 px-4 py-4 text-left hover:border-amber-700/70">
            <div>
              <p className="text-sm font-medium text-amber-100">{alerts.invoicesTotal} facturas guardadas · {alerts.invoiceTotalAmount.toLocaleString("es-ES", { style: "currency", currency: "EUR" })}</p>
              <p className="mt-1 text-xs text-zinc-400">{alerts.unverifiedInvoices} pendientes de confirmar · {alerts.paymentStatusMissing} sin estado de pago. Toca para verlas.</p>
            </div>
            <FolderOpen className="h-5 w-5 shrink-0 text-amber-400" />
          </button>
        )}

        <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
          {categories.map(([value, label]) => <button key={value} onClick={() => value === "invoice" ? showCategory(value) : setCategory(category === value ? undefined : value)} className={`rounded-xl border px-3 py-3 text-left text-xs transition ${category === value ? "border-amber-400 bg-amber-500/15 text-amber-200" : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-100"}`}><span className="mb-2 flex items-center justify-between text-amber-400">{value === "idea" ? <Lightbulb className="h-4 w-4" /> : value === "image" ? <Camera className="h-4 w-4" /> : <Archive className="h-4 w-4" />}{value === "invoice" && alerts.invoicesTotal > 0 ? <strong className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px]">{alerts.invoicesTotal}</strong> : null}</span>{label}</button>)}
        </div>

        <details className="mb-5 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
          <summary className="cursor-pointer text-xs font-medium text-zinc-300">Filtros avanzados</summary>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="filter-input"><option value="">Todos los estados</option><option value="uploaded">Subido</option><option value="extracting">Extrayendo</option><option value="needs_review">Pendiente de revisar</option><option value="processed">Procesado</option><option value="failed">AI fallido</option><option value="archived">Archivado</option></select>
            <select value={paymentFilter} onChange={(event) => setPaymentFilter(event.target.value)} className="filter-input"><option value="">Todos los pagos</option><option value="pending">Pendiente</option><option value="unpaid">Sin pagar</option><option value="due">Vencida</option><option value="paid">Pagada</option></select>
            <select value={verifiedFilter} onChange={(event) => setVerifiedFilter(event.target.value)} className="filter-input"><option value="">Confirmación: todas</option><option value="true">Confirmadas</option><option value="false">Sin confirmar</option></select>
            <input value={supplierId} onChange={(event) => setSupplierId(event.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" placeholder="ID proveedor" className="filter-input" />
            <label className="text-[11px] text-zinc-500">Desde<input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} className="filter-input mt-1" /></label>
            <label className="text-[11px] text-zinc-500">Hasta<input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} className="filter-input mt-1" /></label>
            <input value={amountMin} onChange={(event) => setAmountMin(event.target.value)} inputMode="decimal" placeholder="Importe mín. €" className="filter-input" />
            <div className="flex gap-2"><input value={amountMax} onChange={(event) => setAmountMax(event.target.value)} inputMode="decimal" placeholder="Importe máx. €" className="filter-input" /><button onClick={() => { setStatusFilter(""); setPaymentFilter(""); setVerifiedFilter(""); setDateFrom(""); setDateTo(""); setAmountMin(""); setAmountMax(""); setSupplierId(""); setCategory(undefined); }} className="shrink-0 rounded-lg border border-zinc-700 px-2 text-xs text-zinc-400 hover:text-zinc-100">Limpiar</button></div>
          </div>
        </details>

        <div className="mb-5 flex flex-wrap gap-2">
          <QuickAction icon={<Camera className="h-4 w-4" />} label="Foto" onClick={() => setQuickAddOpen(true)} />
          <QuickAction icon={<StickyNote className="h-4 w-4" />} label="Escribir idea" onClick={() => setQuickAddOpen(true)} />
          <QuickAction icon={<Mic className="h-4 w-4" />} label="Subir audio" onClick={() => setQuickAddOpen(true)} />
          <QuickAction icon={gmailBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />} label="Sincronizar Gmail + Drive" onClick={() => void importGmail()} />
          <QuickAction icon={<Search className="h-4 w-4" />} label="Preguntar al archivo" onClick={() => setChatOpen(true)} />
        </div>

        {error && <div className="mb-4 rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>}
        {notice && <div className="mb-4 rounded-xl border border-emerald-900/60 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-200">{notice}</div>}
        <DocumentoInbox documentos={inbox} onChanged={load} />
        <section id="documento-archive" className="scroll-mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4 shadow-xl sm:p-5">
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Archivo reciente</h2><p className="text-xs text-zinc-500">Los resultados AI quedan listos para revisar: puedes editar, reanalizar y archivar cada registro.</p></div><button onClick={() => void load()} className="text-xs text-amber-400 hover:text-amber-300">Actualizar</button></div>
          {loading ? <div className="flex items-center gap-2 py-10 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" /> Cargando archivo…</div> : <DocumentoList documentos={data.documentos} onChanged={load} />}
        </section>
      </div>
      {quickAddOpen && <QuickAddDocumento onClose={() => setQuickAddOpen(false)} onUploaded={load} />}
      {chatOpen && <DocumentoChatPanel onClose={() => setChatOpen(false)} />}
      <style jsx>{`.filter-input { width: 100%; border-radius: 0.5rem; border: 1px solid rgb(39 39 42); background: rgb(24 24 27); padding: 0.5rem 0.625rem; color: rgb(244 244 245); font-size: 0.75rem; outline: none; } .filter-input:focus { border-color: rgb(217 119 6); }`}</style>
    </div>
  );
}

function Metric({ label, value, icon, onClick }: { label: string; value: string | number; icon: React.ReactNode; onClick?: () => void }) { const content = <><div className="mb-3 flex items-center gap-2 text-amber-400">{icon}<span className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</span></div><p className="text-2xl font-semibold text-zinc-100">{value}</p></>; return onClick ? <button onClick={onClick} className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-left hover:border-amber-700/60">{content}</button> : <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">{content}</div>; }
function QuickAction({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) { return <button onClick={onClick} className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-400 hover:border-amber-600/60 hover:text-amber-200">{icon}{label}</button>; }
