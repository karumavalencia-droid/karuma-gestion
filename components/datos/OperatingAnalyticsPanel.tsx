"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, BarChart3, Bot, CheckCircle2, FileText, Loader2, RefreshCw, ShoppingBag, TrendingUp, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { AnalyticsDataStatus, OperatingAnalytics } from "@/lib/analytics/operating";

type Range = { start: string; end: string };
type Preset = "month" | "last7" | "last30" | "custom";

const currency = new Intl.NumberFormat("es-ES", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const number = new Intl.NumberFormat("es-ES", { maximumFractionDigits: 0 });

function isoDate(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function rangeForPreset(preset: Exclude<Preset, "custom">): Range {
  const today = new Date();
  const end = isoDate(today);
  if (preset === "month") return { start: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), end };
  const days = preset === "last7" ? 6 : 29;
  const start = new Date(today);
  start.setDate(start.getDate() - days);
  return { start: isoDate(start), end };
}

function money(value: number | null | undefined) {
  return value == null ? "—" : currency.format(value);
}

function statusLabel(status: AnalyticsDataStatus) {
  return ({ confirmed: "Confirmado", unconfirmed: "AI sin confirmar", estimated: "Estimado", partial: "Parcial", missing: "Falta fuente" })[status];
}

function statusClass(status: AnalyticsDataStatus) {
  return ({
    confirmed: "border-emerald-800/60 bg-emerald-500/10 text-emerald-300",
    unconfirmed: "border-amber-800/60 bg-amber-500/10 text-amber-200",
    estimated: "border-blue-800/60 bg-blue-500/10 text-blue-200",
    partial: "border-violet-800/60 bg-violet-500/10 text-violet-200",
    missing: "border-zinc-700 bg-zinc-900 text-zinc-400",
  })[status];
}

function Metric({ label, value, detail, status, icon }: { label: string; value: string; detail?: string; status: AnalyticsDataStatus; icon: React.ReactNode }) {
  return <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3"><div className="mb-2 flex items-center justify-between gap-2"><span className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-zinc-500">{icon}{label}</span><span className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(status)}`}>{statusLabel(status)}</span></div><p className="text-xl font-semibold text-zinc-100">{value}</p>{detail ? <p className="mt-1 text-xs text-zinc-500">{detail}</p> : null}</div>;
}

export function OperatingAnalyticsPanel() {
  const [initialRange] = useState<Range>(() => rangeForPreset("month"));
  const [range, setRange] = useState<Range>(initialRange);
  const [preset, setPreset] = useState<Preset>("month");
  const [analytics, setAnalytics] = useState<OperatingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");
  const [summaryBy, setSummaryBy] = useState<"ai" | "rules" | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const load = useCallback(async (nextRange: Range) => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ startDate: nextRange.start, endDate: nextRange.end });
      const response = await fetch(`/api/analytics/operating?${params.toString()}`, { cache: "no-store" });
      const body = (await response.json()) as OperatingAnalytics & { error?: string };
      if (!response.ok) throw new Error(body.error || "No se pudieron cargar los indicadores operativos");
      setAnalytics(body);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudieron cargar los indicadores operativos");
      setAnalytics(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(initialRange);
  }, [initialRange, load]);

  function selectPreset(nextPreset: Exclude<Preset, "custom">) {
    const nextRange = rangeForPreset(nextPreset);
    setPreset(nextPreset);
    setRange(nextRange);
    setSummary("");
    setSummaryBy(null);
    void load(nextRange);
  }

  function applyCustomRange() {
    if (!range.start || !range.end || range.start > range.end) {
      setError("El rango de fechas no es válido.");
      return;
    }
    setPreset("custom");
    setSummary("");
    setSummaryBy(null);
    void load(range);
  }

  async function generateSummary() {
    setSummaryLoading(true);
    setError("");
    try {
      const response = await fetch("/api/analytics/operating/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startDate: range.start, endDate: range.end }),
      });
      const body = (await response.json()) as { summary?: string; generatedBy?: "ai" | "rules"; error?: string };
      if (!response.ok || !body.summary) throw new Error(body.error || "No se pudo generar el resumen");
      setSummary(body.summary);
      setSummaryBy(body.generatedBy || "rules");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No se pudo generar el resumen");
    } finally {
      setSummaryLoading(false);
    }
  }

  return (
    <section className="mb-5 rounded-2xl border border-amber-900/50 bg-[#0d0d0d] p-4 text-zinc-100 shadow-xl sm:mb-6 sm:p-5">
      <div className="flex flex-col gap-3 border-b border-zinc-800 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><BarChart3 className="h-5 w-5 text-amber-400" /><h2 className="font-semibold">Análisis operativo trazable</h2></div>
          <p className="mt-1 max-w-2xl text-xs leading-5 text-zinc-500">Cada cifra indica si procede de ventas confirmadas, facturas revisadas por una persona o una fuente aún ausente. No se presenta una estimación como dato real.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load(range)} disabled={loading} className="gap-2 border-zinc-700 bg-zinc-900 text-zinc-200 hover:bg-zinc-800"><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />Actualizar</Button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(["month", "last7", "last30"] as const).map((item) => <button key={item} onClick={() => selectPreset(item)} className={`rounded-full border px-3 py-1.5 text-xs ${preset === item ? "border-amber-500 bg-amber-500/15 text-amber-200" : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-100"}`}>{item === "month" ? "Este mes" : item === "last7" ? "Últimos 7 días" : "Últimos 30 días"}</button>)}
        <div className="flex min-w-full flex-wrap items-center gap-2 pt-1 sm:min-w-0 sm:pt-0">
          <input type="date" aria-label="Inicio" value={range.start} onChange={(event) => setRange((current) => ({ ...current, start: event.target.value }))} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100" />
          <span className="text-xs text-zinc-600">a</span>
          <input type="date" aria-label="Fin" value={range.end} onChange={(event) => setRange((current) => ({ ...current, end: event.target.value }))} className="rounded-lg border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100" />
          <button onClick={applyCustomRange} className={`rounded-lg border px-3 py-1 text-xs ${preset === "custom" ? "border-amber-500 text-amber-200" : "border-zinc-700 text-zinc-400 hover:text-zinc-100"}`}>Aplicar</button>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-xl border border-red-900/60 bg-red-950/40 p-3 text-sm text-red-200">{error}</div> : null}
      {loading ? <div className="flex min-h-48 items-center gap-2 text-sm text-zinc-500"><Loader2 className="h-4 w-4 animate-spin" />Calculando a partir de fuentes del servidor…</div> : null}

      {!loading && analytics ? <>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs">
          <span className="text-zinc-400">Periodo: <span className="text-zinc-100">{analytics.range.start}</span> a <span className="text-zinc-100">{analytics.range.end}</span> · Comparación: {analytics.range.previous.start} a {analytics.range.previous.end}</span>
          <span className="rounded-full border border-amber-800/60 bg-amber-500/10 px-2 py-1 text-amber-200">Completitud: {analytics.dataCompleteness}%</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Metric label="Ventas netas" value={money(analytics.metrics.revenue)} detail={analytics.metrics.revenueChangePct == null ? "Sin comparación suficiente" : `${analytics.metrics.revenueChangePct >= 0 ? "+" : ""}${analytics.metrics.revenueChangePct}% vs. periodo anterior`} status={analytics.metricStatus.revenue} icon={<TrendingUp className="h-3.5 w-3.5 text-amber-400" />} />
          <Metric label="Clientes" value={analytics.metrics.customers == null ? "—" : number.format(analytics.metrics.customers)} detail={analytics.metrics.averageTicket == null ? "Sin ticket medio" : `Ticket medio ${money(analytics.metrics.averageTicket)}`} status={analytics.metricStatus.customers} icon={<Users className="h-3.5 w-3.5 text-amber-400" />} />
          <Metric label="Compras" value={money(analytics.metrics.purchaseConfirmed)} detail={analytics.metrics.purchaseUnconfirmed == null ? "Solo facturas confirmadas" : `${money(analytics.metrics.purchaseUnconfirmed)} AI sin confirmar`} status={analytics.metricStatus.purchases} icon={<ShoppingBag className="h-3.5 w-3.5 text-amber-400" />} />
          <Metric label="Coste de compras" value={analytics.metrics.foodCostRate == null ? "—" : `${analytics.metrics.foodCostRate}%`} detail="Compras confirmadas ÷ ventas netas" status={analytics.metricStatus.foodCost} icon={<BarChart3 className="h-3.5 w-3.5 text-amber-400" />} />
          <Metric label="Resultado parcial" value={money(analytics.metrics.operatingProfitPartial)} detail="Excluye personal, alquiler, suministros y comisiones" status={analytics.metricStatus.partialOperatingProfit} icon={<Wallet className="h-3.5 w-3.5 text-amber-400" />} />
          <Metric label="Delivery / bebidas" value={analytics.metrics.deliverySales == null && analytics.metrics.drinkSales == null ? "—" : `${money(analytics.metrics.deliverySales)} / ${money(analytics.metrics.drinkSales)}`} detail="Ventas delivery / bebidas declaradas" status={analytics.metricStatus.revenue} icon={<TrendingUp className="h-3.5 w-3.5 text-amber-400" />} />
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-medium">Compras por proveedor</h3><p className="mt-1 text-xs text-zinc-500">Solo importes de facturas confirmadas.</p></div><span className={`rounded-full border px-2 py-1 text-[10px] ${statusClass(analytics.purchaseAnalysis.status)}`}>{statusLabel(analytics.purchaseAnalysis.status)}</span></div>
            {analytics.purchaseAnalysis.suppliers.length ? <div className="mt-3 space-y-2">{analytics.purchaseAnalysis.suppliers.map((supplier) => <div key={supplier.supplierId} className="flex items-center justify-between gap-3 rounded-lg bg-zinc-900 px-3 py-2 text-xs"><span className="min-w-0 truncate text-zinc-200">{supplier.supplierName}<span className="ml-1 text-zinc-500">· {supplier.invoiceCount} factura(s)</span></span><span className="shrink-0 text-amber-200">{money(supplier.total)}</span></div>)}</div> : <p className="mt-3 text-xs text-zinc-500">No hay proveedores vinculados a facturas confirmadas en este periodo.</p>}
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex items-center justify-between gap-3"><div><h3 className="text-sm font-medium">Productos y precio medio</h3><p className="mt-1 text-xs text-zinc-500">Conserva el nombre original de cada línea de factura.</p></div><FileText className="h-4 w-4 text-amber-400" /></div>
            {analytics.purchaseAnalysis.products.length ? <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">{analytics.purchaseAnalysis.products.slice(0, 10).map((product) => <div key={`${product.productName}-${product.unit || ""}`} className="rounded-lg bg-zinc-900 px-3 py-2 text-xs"><div className="flex justify-between gap-3"><span className="min-w-0 truncate text-zinc-200">{product.productName}</span><span className="shrink-0 text-amber-200">{money(product.total)}</span></div><p className="mt-1 text-zinc-500">{product.quantity} {product.unit || "ud."} · {product.averageUnitPrice == null ? "precio no extraído" : `${money(product.averageUnitPrice)} / ${product.unit || "ud."}`}{product.priceChangePct == null ? "" : ` · ${product.priceChangePct >= 0 ? "+" : ""}${product.priceChangePct}%`}</p></div>)}</div> : <p className="mt-3 text-xs text-zinc-500">No hay líneas AI confirmadas. Confirma las facturas y sus productos en Documento para activar este análisis.</p>}
          </div>
        </div>

        <div className="mt-4 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-400" /><h3 className="text-sm font-medium">Excepciones a revisar</h3></div><Link href="/documento" className="text-xs text-amber-300 hover:text-amber-200">Abrir Documento</Link></div>{analytics.anomalies.length ? <div className="mt-3 space-y-2">{analytics.anomalies.map((anomaly, index) => <Link key={`${anomaly.type}-${index}`} href={anomaly.href} className={`block rounded-lg border p-3 text-xs ${anomaly.severity === "danger" ? "border-red-900/60 bg-red-950/30" : anomaly.severity === "warning" ? "border-amber-900/60 bg-amber-500/5" : "border-zinc-800 bg-zinc-900"}`}><p className="font-medium text-zinc-100">{anomaly.title}</p><p className="mt-1 leading-5 text-zinc-400">{anomaly.detail}</p></Link>)}</div> : <p className="mt-3 flex items-center gap-2 text-xs text-emerald-300"><CheckCircle2 className="h-4 w-4" />No hay excepciones detectadas con las fuentes disponibles.</p>}</div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4"><div className="flex items-center gap-2"><Bot className="h-4 w-4 text-amber-400" /><h3 className="text-sm font-medium">Resumen operativo</h3></div><p className="mt-1 text-xs leading-5 text-zinc-500">Se genera bajo demanda con las cifras ya calculadas; el modelo no consulta ni inventa datos por sí mismo.</p><Button size="sm" variant="outline" onClick={() => void generateSummary()} disabled={summaryLoading} className="mt-3 gap-2 border-amber-800/60 bg-amber-500/5 text-amber-200 hover:bg-amber-500/10">{summaryLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}{summary ? "Regenerar resumen" : "Generar resumen"}</Button>{summary ? <div className="mt-3 rounded-lg border border-amber-900/40 bg-amber-500/5 p-3 text-sm leading-6 text-zinc-200"><p>{summary}</p><p className="mt-2 text-[10px] uppercase tracking-wide text-zinc-500">{summaryBy === "ai" ? "Redacción AI basada en evidencia" : "Resumen determinista: falta OPENAI_API_KEY"}</p></div> : null}</div>
        </div>

        <details className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4"><summary className="cursor-pointer text-sm font-medium text-zinc-200">Fuentes y cobertura de datos</summary><div className="mt-3 space-y-2">{analytics.sources.map((source) => <div key={source.key} className="flex flex-col gap-2 rounded-lg bg-zinc-900 p-3 text-xs sm:flex-row sm:items-center sm:justify-between"><div><p className="text-zinc-200">{source.label} <span className="ml-1 text-zinc-500">· {source.records} registro(s)</span></p>{source.note ? <p className="mt-1 text-zinc-500">{source.note}</p> : null}</div><div className="flex items-center gap-2"><span className={`rounded-full border px-2 py-1 text-[10px] ${statusClass(source.status)}`}>{statusLabel(source.status)}</span><Link href={source.href} className="text-amber-300 hover:text-amber-200">Ver datos</Link></div></div>)}</div></details>
      </> : null}
    </section>
  );
}
