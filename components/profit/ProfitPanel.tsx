"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  Building2,
  Calculator,
  Pencil,
  PieChart,
  Plus,
  ShoppingBag,
  Trash2,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import {
  EMPTY_PROFIT_FORM,
  OBJETIVO_VENTAS,
  computeMetrics,
  genId,
  generarSugerenciasAI,
  getRegistroMes,
  loadProfit,
  mesLabel,
  parseProfitForm,
  registroToForm,
  saveProfit,
  type ProfitForm,
} from "@/lib/profit/helpers";
import { RegistroProfit } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type Tab = "detalle" | "registros" | "ai";
type ModalKind = "registro" | "confirm" | null;

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 p-0 sm:items-center sm:p-4">
      <div className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:max-w-lg sm:rounded-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-600">
        {label}
        {required && " *"}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-karuma-500 focus:outline-none focus:ring-1 focus:ring-karuma-500";

const sugerenciaStyles = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-900",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
  danger: "border-red-200 bg-red-50 text-red-900",
};

export function ProfitPanel() {
  const [registros, setRegistros] = useState<RegistroProfit[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("detalle");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<ProfitForm>(EMPTY_PROFIT_FORM);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth();

  useEffect(() => {
    try {
      setRegistros(loadProfit().registros);
    } finally {
      setLoaded(true);
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2500);
  }, []);

  const persist = useCallback((next: RegistroProfit[]) => {
    setRegistros(next);
    saveProfit({ registros: next });
  }, []);

  const registroActual = useMemo(
    () => getRegistroMes(registros, year, month),
    [registros, year, month],
  );

  const metrics = useMemo(() => computeMetrics(registroActual), [registroActual]);
  const sugerencias = useMemo(() => generarSugerenciasAI(metrics), [metrics]);
  const mesActualLabel = registroActual
    ? mesLabel(registroActual.mes)
    : now.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  const openModal = (mode: "add" | "edit", id?: string) => {
    setEditId(mode === "edit" ? (id ?? null) : null);
    if (mode === "edit" && id) {
      const reg = registros.find((r) => r.id === id);
      if (reg) setForm(registroToForm(reg));
    } else {
      setForm(EMPTY_PROFIT_FORM);
    }
    setModal("registro");
  };

  const saveRegistro = () => {
    const parsed = parseProfitForm(form);
    if (!parsed) {
      showToast("Completa mes y ventas");
      return;
    }

    const duplicado = registros.find((r) => r.mes === parsed.mes && r.id !== editId);
    if (duplicado) {
      showToast("Ya existe un registro para ese mes");
      return;
    }

    if (editId) {
      persist(registros.map((r) => (r.id === editId ? { ...r, ...parsed } : r)));
      showToast("Registro actualizado");
    } else {
      persist([...registros, { id: genId(), ...parsed }]);
      showToast("Registro añadido");
    }

    setModal(null);
    setForm(EMPTY_PROFIT_FORM);
    setEditId(null);
  };

  const confirmDelete = (id: string) => {
    const reg = registros.find((r) => r.id === id);
    if (!reg) return;
    setConfirmMessage(`¿Eliminar registro de ${mesLabel(reg.mes)}?`);
    setConfirmAction(() => () => {
      persist(registros.filter((r) => r.id !== id));
      setModal(null);
      showToast("Registro eliminado");
    });
    setModal("confirm");
  };

  const updateForm = (field: keyof ProfitForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const sortedRegistros = useMemo(
    () => [...registros].sort((a, b) => b.mes.localeCompare(a.mes)),
    [registros],
  );

  return (
    <div>
      <PageHeader
        title="Centro de Beneficio"
        description={`Profit Dashboard · ${mesActualLabel}`}
      >
        <Button size="sm" className="gap-1.5" onClick={() => openModal("add")}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo mes</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </PageHeader>

      {/* KPIs principales */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
        <StatCard
          title="Ventas del mes"
          value={formatCurrency(metrics.ventas)}
          icon={TrendingUp}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Compras estimadas"
          value={formatCurrency(metrics.compras)}
          subtitle={`${metrics.costeComidaPct}% ventas`}
          icon={ShoppingBag}
          iconColor="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Coste personal"
          value={formatCurrency(metrics.personal)}
          subtitle={`${metrics.costePersonalPct}% ventas`}
          icon={Users}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Alquiler + impuestos"
          value={formatCurrency(metrics.alquilerImpuestos)}
          icon={Building2}
          iconColor="bg-slate-50 text-slate-600"
        />
        <StatCard
          title="Beneficio estimado"
          value={formatCurrency(metrics.beneficioNeto)}
          trend={metrics.beneficioNeto >= 0 ? "Positivo" : "Negativo"}
          trendUp={metrics.beneficioNeto >= 0}
          icon={Wallet}
          iconColor={
            metrics.beneficioNeto >= 0
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-600"
          }
        />
        <StatCard
          title="Margen neto"
          value={`${metrics.margenNetoPct}%`}
          icon={PieChart}
          iconColor="bg-purple-50 text-purple-600"
        />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        {(
          [
            { id: "detalle", label: "Detalle", icon: Calculator },
            { id: "registros", label: "Costes", icon: Wallet },
            { id: "ai", label: "AI Gerente", icon: Bot },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-medium transition-colors sm:text-sm ${
              tab === id ? "bg-karuma-600 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {tab === "detalle" && (
        <div className="space-y-4">
          {!registroActual ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
              Sin datos para {mesActualLabel}. Pulsa Nuevo mes para introducir costes.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-500">Beneficio bruto</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {formatCurrency(metrics.beneficioBruto)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Ventas − compras</p>
                </div>
                <div className="rounded-xl border border-karuma-200 bg-karuma-50 p-4 shadow-sm">
                  <p className="text-xs text-karuma-700">Beneficio neto</p>
                  <p className="mt-1 text-xl font-bold text-karuma-900">
                    {formatCurrency(metrics.beneficioNeto)}
                  </p>
                  <p className="mt-1 text-xs text-karuma-600">Margen {metrics.margenNetoPct}%</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-500">Punto de equilibrio</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {formatCurrency(metrics.puntoEquilibrio)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Ventas mínimas para cubrir costes</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <p className="text-xs text-gray-500">Total costes</p>
                  <p className="mt-1 text-xl font-bold text-gray-900">
                    {formatCurrency(metrics.totalCostes)}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Fijos: {formatCurrency(metrics.costesFijos)}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-indigo-900">
                  Escenario {OBJETIVO_VENTAS.toLocaleString("es-ES")} € de ventas
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-indigo-600">Ventas necesarias</p>
                    <p className="font-bold text-indigo-950">
                      {metrics.ventasNecesarias100k > 0
                        ? `+${formatCurrency(metrics.ventasNecesarias100k)}`
                        : "Objetivo alcanzado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-600">Beneficio estimado a 100.000 €</p>
                    <p className="font-bold text-indigo-950">
                      {formatCurrency(metrics.beneficioSi100k)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Desglose de costes</h3>
                <dl className="space-y-2 text-sm">
                  {[
                    { label: "Compras", value: metrics.compras, pct: metrics.costeComidaPct },
                    { label: "Personal", value: metrics.personal, pct: metrics.costePersonalPct },
                    { label: "Alquiler", value: metrics.alquiler },
                    { label: "Luz / Agua / Gas", value: metrics.suministros },
                    { label: "Gestoría", value: metrics.gestoria },
                    { label: "Otros gastos", value: metrics.otros },
                  ].map(({ label, value, pct }) => (
                    <div key={label} className="flex items-center justify-between gap-2">
                      <dt className="text-gray-500">{label}</dt>
                      <dd className="font-medium text-gray-900">
                        {formatCurrency(value)}
                        {pct !== undefined && (
                          <span className="ml-2 text-xs text-gray-400">({pct}%)</span>
                        )}
                      </dd>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-2 border-t border-gray-100 pt-2 font-semibold">
                    <dt className="text-gray-700">Total</dt>
                    <dd className="text-gray-900">{formatCurrency(metrics.totalCostes)}</dd>
                  </div>
                </dl>
              </div>
            </>
          )}
        </div>
      )}

      {tab === "registros" && (
        <>
          {!loaded ? (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
              Cargando…
            </div>
          ) : sortedRegistros.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
              Sin registros. Pulsa Nuevo mes.
            </div>
          ) : (
            <div className="space-y-3">
              {sortedRegistros.map((reg) => {
                const m = computeMetrics(reg);
                return (
                  <article
                    key={reg.id}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold capitalize text-gray-900">
                          {mesLabel(reg.mes)}
                        </h3>
                        <p className="text-xs text-gray-500">
                          Margen neto {m.margenNetoPct}% · Beneficio{" "}
                          {formatCurrency(m.beneficioNeto)}
                        </p>
                      </div>
                      <p className="text-lg font-bold text-karuma-600">
                        {formatCurrency(reg.ventas)}
                      </p>
                    </div>

                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                      <div>
                        <dt className="text-xs text-gray-500">Compras</dt>
                        <dd>{formatCurrency(reg.compras)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Personal</dt>
                        <dd>{formatCurrency(reg.personal)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Alquiler</dt>
                        <dd>{formatCurrency(reg.alquiler)}</dd>
                      </div>
                      <div>
                        <dt className="text-xs text-gray-500">Otros</dt>
                        <dd>
                          {formatCurrency(reg.suministros + reg.gestoria + reg.otros)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => openModal("edit", reg.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-red-600 hover:bg-red-50"
                        onClick={() => confirmDelete(reg.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "ai" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-karuma-200 bg-karuma-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Bot className="h-5 w-5 text-karuma-600" />
              <h3 className="font-semibold text-karuma-900">AI Gerente · Beneficio</h3>
            </div>
            <p className="text-sm text-karuma-800">
              Análisis de rentabilidad basado en los costes de {mesActualLabel}.
            </p>
          </div>

          {!registroActual ? (
            <p className="text-sm text-gray-500">Introduce datos de costes para obtener insights.</p>
          ) : (
            sugerencias.map((s) => (
              <div
                key={s.id}
                className={`rounded-xl border p-4 ${sugerenciaStyles[s.tipo]}`}
              >
                <p className="font-semibold">{s.titulo}</p>
                <p className="mt-1 text-sm leading-relaxed opacity-90">{s.mensaje}</p>
              </div>
            ))
          )}
        </div>
      )}

      <Modal
        open={modal === "registro"}
        title={editId ? "Editar costes del mes" : "Nuevo registro mensual"}
        onClose={() => setModal(null)}
      >
        <div className="space-y-4">
          <Field label="Mes" required>
            <input
              type="month"
              value={form.mes}
              onChange={(e) => updateForm("mes", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Ventas €" required>
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.ventas}
              onChange={(e) => updateForm("ventas", e.target.value)}
              placeholder="71734.55"
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Compras €">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.compras}
                onChange={(e) => updateForm("compras", e.target.value)}
                placeholder="18000"
                className={inputClass}
              />
            </Field>
            <Field label="Personal €">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.personal}
                onChange={(e) => updateForm("personal", e.target.value)}
                placeholder="27000"
                className={inputClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Alquiler €">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.alquiler}
                onChange={(e) => updateForm("alquiler", e.target.value)}
                placeholder="7000"
                className={inputClass}
              />
            </Field>
            <Field label="Luz / Agua / Gas €">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.suministros}
                onChange={(e) => updateForm("suministros", e.target.value)}
                placeholder="650"
                className={inputClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Gestoría €">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.gestoria}
                onChange={(e) => updateForm("gestoria", e.target.value)}
                placeholder="400"
                className={inputClass}
              />
            </Field>
            <Field label="Otros gastos €">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.otros}
                onChange={(e) => updateForm("otros", e.target.value)}
                placeholder="2500"
                className={inputClass}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button onClick={saveRegistro}>Guardar</Button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "confirm"} title="Confirmar" onClose={() => setModal(null)}>
        <p className="mb-4 text-sm leading-relaxed text-gray-600">{confirmMessage}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setModal(null)}>
            Cancelar
          </Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => confirmAction?.()}>
            Eliminar
          </Button>
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
