"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Plus, RefreshCw, Wallet, Users, ShoppingBag, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Button } from "@/components/ui/Button";
import { COST_CATEGORIES, madridMonth, reportCsv, type ProfitReport } from "@/lib/profit/report";
import type { DbGastoCategoria } from "@/lib/supabase/types";
import { formatCurrency } from "@/lib/utils";

const inputClass = "w-full rounded-lg border border-gray-300 bg-white p-2.5 text-sm text-gray-900";
const money = (n: number | null) => n === null ? "Sin datos" : formatCurrency(n);

export function LiveProfitPanel() {
  const [month, setMonth] = useState(madridMonth);
  const [report, setReport] = useState<ProfitReport | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"informe" | "costes">("informe");
  const [form, setForm] = useState({ fecha: "", categoria: "personal" as DbGastoCategoria, concepto: "", importe: "", notas: "" });
  const sequence = useRef(0);
  const activeMonth = useRef(month);
  activeMonth.current = month;

  const refresh = useCallback(async () => {
    const id = ++sequence.current;
    const requestedMonth = month;
    setBusy(true);
    try {
      const response = await fetch(`/api/profit/report?mes=${month}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo cargar el informe");
      if (id === sequence.current && requestedMonth === activeMonth.current) { setReport(data); setError(""); }
    } catch (e) {
      if (id === sequence.current && requestedMonth === activeMonth.current) setError(e instanceof Error ? e.message : "Error de conexión");
    } finally { if (id === sequence.current) setBusy(false); }
  }, [month]);

  useEffect(() => {
    setReport(null);
    void refresh();
    const timer = window.setInterval(() => { if (!document.hidden) void refresh(); }, 60_000);
    const onFocus = () => { void refresh(); };
    window.addEventListener("focus", onFocus);
    return () => { ++sequence.current; window.clearInterval(timer); window.removeEventListener("focus", onFocus); };
  }, [refresh]);

  async function saveExpense(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setFormError("");
    try {
      const response = await fetch("/api/gastos", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, importe: Number(form.importe), empresa: "kosushi" }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo guardar");
      setOpen(false);
      if (form.fecha.slice(0, 7) !== month) setMonth(form.fecha.slice(0, 7));
      else await refresh();
    } catch (e) { setFormError(e instanceof Error ? e.message : "Error al guardar"); }
    finally { setSaving(false); }
  }

  function exportReport() {
    if (!report) return;
    const url = URL.createObjectURL(new Blob([reportCsv(report)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a"); a.href = url; a.download = `karuma-beneficio-${report.month}.csv`; a.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div id="profit-report" className="space-y-5">
    <style>{`
      @media print {
        body * { visibility: hidden; }
        #profit-report, #profit-report * { visibility: visible; }
        #profit-report { position: absolute; inset: 0 auto auto 0; width: 100%; padding: 12mm; background: white; }
        #profit-report button, #profit-report input { display: none !important; }
        #profit-report table { min-width: 0 !important; }
        #profit-report tr { break-inside: avoid; }
      }
    `}</style>
    <PageHeader title="Centro de Beneficio" description="Cuenta de resultados · Karuma Valencia">
      <Button onClick={() => { setForm({ fecha: `${month}-01`, categoria: "personal", concepto: "", importe: "", notas: "" }); setFormError(""); setOpen(true); }} className="gap-2"><Plus className="h-4 w-4" />Registrar coste</Button>
    </PageHeader>
    <div className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-4">
      <label className="text-sm font-medium">Mes <input aria-label="Mes del informe" type="month" min="2000-01" max="2100-12" value={month} onChange={e => { if (e.target.value) setMonth(e.target.value); }} className="ml-2 rounded-lg border p-2" /></label>
      <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={busy} className="gap-2"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />Actualizar</Button>
      <Button variant="outline" size="sm" onClick={exportReport} disabled={!report || !!error} className="gap-2"><Download className="h-4 w-4" />Exportar CSV</Button>
      <Button variant="outline" size="sm" disabled={!report || !!error} onClick={() => window.print()}>Imprimir / PDF</Button>
      <p className="text-xs text-gray-500" aria-live="polite">{busy ? "Consultando datos…" : report ? `Actualizado ${new Date(report.generatedAt).toLocaleTimeString("es-ES", { timeZone: "Europe/Madrid" })} · actualización cada minuto con la página abierta` : ""}</p>
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error} {report && "Los datos visibles corresponden a la última consulta correcta."}</div>}
    {!report ? <p className="p-8 text-center text-gray-500">{busy ? "Cargando informe…" : "Informe no disponible."}</p> : <>
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <p className="font-semibold">Resultado provisional · pendiente de cierre</p>
        <p className="mt-1">{report.salesDays} días con registros de ventas. Última venta registrada: {report.latestSale ?? "sin datos"}. Comprueba que el período esté completo.</p>
        {report.missing.length > 0 && <p className="mt-1">Sin registros: {report.missing.join(" · ")}.</p>}
        <p className="mt-1">{report.documentsToReview === null ? "No se pudo comprobar la cola de documentos." : `${report.documentsToReview} documentos de facturas, nóminas o impuestos fechados en este mes para conciliar con los gastos.`} <a className="underline" href="/documentos">Revisar documentos</a></p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard title="Ventas netas registradas" value={money(report.revenue)} icon={TrendingUp} iconColor="bg-emerald-50 text-emerald-600" />
        <StatCard title="Compras registradas" value={report.categories.some(c => c.key === "proveedores" && c.records > 0) ? money(report.purchases) : "Pendiente"} icon={ShoppingBag} iconColor="bg-amber-50 text-amber-600" />
        <StatCard title="Coste de personal" subtitle="Salarios + Seguridad Social" value={report.categories.some(c => ["personal", "seguros_sociales"].includes(c.key) && c.records > 0) ? money(report.labor) : "Pendiente"} icon={Users} iconColor="bg-blue-50 text-blue-600" />
        <StatCard title="Resultado provisional" value={money(report.result)} subtitle={report.margin === null ? "Margen no disponible" : `Margen provisional ${report.margin}%`} icon={Wallet} iconColor="bg-purple-50 text-purple-600" />
      </div>
      <div className="flex gap-2" role="group" aria-label="Vista del informe">
        <Button variant={tab === "informe" ? "primary" : "outline"} onClick={() => setTab("informe")}>Cuenta de resultados</Button>
        <Button variant={tab === "costes" ? "primary" : "outline"} onClick={() => setTab("costes")}>Detalle de costes ({report.expenses.length})</Button>
      </div>
      {tab === "informe" ? <div className="overflow-x-auto rounded-xl border bg-white p-4 sm:p-6">
        <h2 className="mb-4 text-lg font-semibold">Cuenta de resultados · {month}</h2>
        <table className="w-full text-sm"><thead><tr className="border-b text-left text-gray-500"><th className="py-3">Concepto</th><th className="text-right">Importe</th><th className="pl-4 text-right">Cobertura</th></tr></thead>
          <tbody>
            <tr className="border-b font-semibold"><td className="py-3">Ventas netas registradas</td><td className="text-right">{money(report.revenue)}</td><td className="pl-4 text-right">{report.salesDays} días</td></tr>
            {report.categories.map(c => <tr className="border-b" key={c.key}><td className="py-3">{c.label}</td><td className="text-right">{c.records ? money(c.amount) : "—"}</td><td className={`pl-4 text-right ${c.records ? "text-gray-500" : "text-amber-700"}`}>{c.records ? `${c.records} registros` : "Pendiente"}</td></tr>)}
            <tr className="border-b font-semibold"><td className="py-3">Total costes registrados</td><td className="text-right">{money(report.costs)}</td><td /></tr>
            <tr className="font-bold"><td className="py-4">Resultado provisional</td><td className={`text-right ${report.result !== null && report.result < 0 ? "text-red-600" : "text-gray-900"}`}>{money(report.result)}</td><td className="pl-4 text-right text-amber-700">Sin cerrar</td></tr>
          </tbody></table>
      </div> : <div className="overflow-x-auto rounded-xl border bg-white p-4">
        <table className="w-full min-w-[640px] text-sm"><thead><tr className="border-b text-left text-gray-500"><th className="py-3">Fecha</th><th>Categoría / concepto</th><th>Fuente</th><th className="text-right">Importe registrado</th></tr></thead>
          <tbody>{report.expenses.map(e => <tr key={e.id} className="border-b"><td className="py-3 pr-3">{e.fecha}</td><td className="py-3 pr-3"><p>{e.concepto}</p><p className="text-xs text-gray-500">{COST_CATEGORIES[e.categoria]}{e.notas ? ` · ${e.notas}` : ""}</p></td><td>{e.fuente}</td><td className="text-right">{money(Number(e.importe))}</td></tr>)}</tbody></table>
        {report.expenses.length === 0 && <p className="py-8 text-center text-gray-500">No hay costes registrados para este mes. Registra los importes con sus justificantes.</p>}
        <p className="mt-4 text-sm text-gray-500">Los costes se comparten con <a href="/finanzas" className="underline">Finanzas</a>, donde puedes gestionar las anotaciones.</p>
      </div>}
      <div className="rounded-xl border bg-white p-4 text-xs leading-relaxed text-gray-500">{report.notes.map(note => <p className="mb-2 last:mb-0" key={note}>{note}</p>)}</div>
    </>}
    {open && <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4" onKeyDown={e => {
      if (e.key === "Escape" && !saving) setOpen(false);
      if (e.key === "Tab") {
        const elements = e.currentTarget.querySelectorAll<HTMLElement>("input,select,textarea,button:not(:disabled)");
        const first = elements[0], last = elements[elements.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
    }}>
      <section role="dialog" aria-modal="true" aria-labelledby="cost-title" className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 id="cost-title" className="mb-2 text-lg font-semibold">Registrar coste real</h2>
        <p className="mb-4 text-sm text-gray-500">Comprueba que no esté registrado en Finanzas. Incluye sueldo bruto y cuota empresarial en sus categorías correspondientes.</p>
        <form onSubmit={saveExpense} className="space-y-4">
          <label className="block text-sm">Fecha de devengo<input autoFocus required type="date" className={inputClass} value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></label>
          <label className="block text-sm">Categoría<select className={inputClass} value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value as DbGastoCategoria })}>{Object.entries(COST_CATEGORIES).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>
          <label className="block text-sm">Concepto / referencia de factura<input required maxLength={500} className={inputClass} value={form.concepto} onChange={e => setForm({ ...form, concepto: e.target.value })} /></label>
          <label className="block text-sm">Importe registrado (€)<input required type="number" min="0.01" step="0.01" className={inputClass} value={form.importe} onChange={e => setForm({ ...form, importe: e.target.value })} /></label>
          <label className="block text-sm">Notas (base, IVA, proveedor, período)<textarea maxLength={2000} className={inputClass} value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} /></label>
          {formError && <p role="alert" className="text-sm text-red-600">{formError}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={saving} onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" disabled={saving}>{saving ? "Guardando…" : "Guardar en base de datos"}</Button></div>
        </form>
      </section>
    </div>}
  </div>;
}
