"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { formatCurrency } from "@/lib/utils";
import type { DbGasto, DbGastoCategoria } from "@/lib/supabase/types";
import { Plus, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";

const CATEGORIA_LABELS: Record<DbGastoCategoria, string> = {
  alquiler: "Alquiler",
  personal: "Personal / Nóminas",
  seguros_sociales: "Seguros sociales",
  proveedores: "Proveedores",
  suministros: "Suministros (luz/agua/gas)",
  impuestos: "Impuestos",
  marketing: "Marketing",
  comisiones: "Comisiones delivery",
  otros: "Otros",
};

type Resumen = {
  mes: string;
  ingresos: number;
  diasConVentas: number;
  gastos: number;
  beneficio: number;
  gastosPorCategoria: Record<string, number>;
};

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

export default function FinanzasPage() {
  const [mes, setMes] = useState(currentMonth);
  const [resumen, setResumen] = useState<Resumen | null>(null);
  const [gastos, setGastos] = useState<DbGasto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // Formulario de alta
  const [formFecha, setFormFecha] = useState(() => new Date().toISOString().slice(0, 10));
  const [formCategoria, setFormCategoria] = useState<DbGastoCategoria>("proveedores");
  const [formConcepto, setFormConcepto] = useState("");
  const [formImporte, setFormImporte] = useState("");
  const [formEmpresa, setFormEmpresa] = useState<"kosushi" | "spicy">("kosushi");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [resumenRes, gastosRes] = await Promise.all([
        fetch(`/api/finanzas/resumen?mes=${mes}`, { cache: "no-store" }),
        fetch(`/api/gastos?mes=${mes}`, { cache: "no-store" }),
      ]);
      if (!resumenRes.ok || !gastosRes.ok) {
        const body = await (resumenRes.ok ? gastosRes : resumenRes).json().catch(() => null);
        throw new Error(body?.error || "Error cargando datos");
      }
      setResumen(await resumenRes.json());
      setGastos((await gastosRes.json()).gastos ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error cargando datos");
    } finally {
      setLoading(false);
    }
  }, [mes]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: formFecha,
          categoria: formCategoria,
          concepto: formConcepto,
          importe: Number(formImporte.replace(",", ".")),
          empresa: formEmpresa,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Error guardando");
      setFormConcepto("");
      setFormImporte("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error guardando");
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!window.confirm("¿Eliminar este gasto?")) return;
    const res = await fetch(`/api/gastos/${id}`, { method: "DELETE" });
    if (res.ok) await load();
  };

  const desglose = useMemo(() => {
    const entries = Object.entries(resumen?.gastosPorCategoria ?? {});
    const total = entries.reduce((sum, [, importe]) => sum + importe, 0);
    return entries
      .sort(([, a], [, b]) => b - a)
      .map(([categoria, importe]) => ({
        categoria,
        label: CATEGORIA_LABELS[categoria as DbGastoCategoria] ?? categoria,
        importe,
        porcentaje: total > 0 ? (importe / total) * 100 : 0,
      }));
  }, [resumen]);

  const margen =
    resumen && resumen.ingresos > 0
      ? ((resumen.beneficio / resumen.ingresos) * 100).toFixed(1)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <PageHeader
          title="Finanzas"
          description="Ingresos y gastos reales — solo propietario"
        />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          Mes
          <input
            type="month"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            className={`${inputClass} w-auto`}
          />
        </label>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          title="Ingresos (ventas)"
          value={loading ? "…" : formatCurrency(resumen?.ingresos ?? 0)}
          subtitle={
            resumen && resumen.diasConVentas === 0
              ? "Sin ventas importadas este mes"
              : `${resumen?.diasConVentas ?? 0} días con ventas`
          }
          icon={TrendingUp}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Gastos"
          value={loading ? "…" : formatCurrency(resumen?.gastos ?? 0)}
          subtitle={`${gastos.length} apuntes`}
          icon={TrendingDown}
          iconColor="bg-red-50 text-red-600"
        />
        <StatCard
          title="Beneficio"
          value={loading ? "…" : formatCurrency(resumen?.beneficio ?? 0)}
          subtitle={margen ? `Margen ${margen}%` : "—"}
          icon={Wallet}
          iconColor="bg-blue-50 text-blue-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Card title="Añadir gasto">
          <form onSubmit={handleCrear} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-gray-600">Fecha</span>
                <input
                  type="date"
                  value={formFecha}
                  onChange={(e) => setFormFecha(e.target.value)}
                  className={inputClass}
                  required
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-gray-600">Categoría</span>
                <select
                  value={formCategoria}
                  onChange={(e) => setFormCategoria(e.target.value as DbGastoCategoria)}
                  className={inputClass}
                >
                  {Object.entries(CATEGORIA_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-gray-600">Concepto</span>
              <input
                type="text"
                value={formConcepto}
                onChange={(e) => setFormConcepto(e.target.value)}
                className={inputClass}
                placeholder="Alquiler julio, nómina Carlos…"
                required
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="text-xs font-medium text-gray-600">Importe (€)</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formImporte}
                  onChange={(e) => setFormImporte(e.target.value)}
                  className={inputClass}
                  placeholder="1250,00"
                  required
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-medium text-gray-600">Empresa</span>
                <select
                  value={formEmpresa}
                  onChange={(e) => setFormEmpresa(e.target.value as "kosushi" | "spicy")}
                  className={inputClass}
                >
                  <option value="kosushi">Kosushi</option>
                  <option value="spicy">Spicy</option>
                </select>
              </label>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-[40px] w-full items-center justify-center gap-2 rounded-lg bg-karuma-600 px-4 py-2 text-sm font-medium text-white hover:bg-karuma-700 disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              {saving ? "Guardando…" : "Añadir gasto"}
            </button>
          </form>
        </Card>

        <Card title="Desglose de gastos por categoría">
          {desglose.length === 0 ? (
            <p className="text-sm text-gray-500">Sin gastos registrados este mes.</p>
          ) : (
            <div className="space-y-3">
              {desglose.map((item) => (
                <div key={item.categoria}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-gray-700">{item.label}</span>
                    <span className="font-medium text-gray-900">
                      {formatCurrency(item.importe)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-red-400"
                      style={{ width: `${item.porcentaje}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title={`Gastos de ${mes}`}>
        {loading ? (
          <p className="text-sm text-gray-500">Cargando…</p>
        ) : gastos.length === 0 ? (
          <p className="text-sm text-gray-500">
            Todavía no hay gastos este mes. Añade el primero con el formulario.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Categoría</th>
                  <th className="py-2 pr-3">Concepto</th>
                  <th className="py-2 pr-3">Empresa</th>
                  <th className="py-2 pr-3 text-right">Importe</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {gastos.map((gasto) => (
                  <tr key={gasto.id} className="border-b border-gray-50">
                    <td className="py-2 pr-3 whitespace-nowrap text-gray-600">{gasto.fecha}</td>
                    <td className="py-2 pr-3 text-gray-700">
                      {CATEGORIA_LABELS[gasto.categoria] ?? gasto.categoria}
                    </td>
                    <td className="py-2 pr-3 text-gray-900">{gasto.concepto}</td>
                    <td className="py-2 pr-3 capitalize text-gray-600">{gasto.empresa}</td>
                    <td className="py-2 pr-3 text-right font-medium text-gray-900">
                      {formatCurrency(Number(gasto.importe))}
                    </td>
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => handleEliminar(gasto.id)}
                        className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="Eliminar gasto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
