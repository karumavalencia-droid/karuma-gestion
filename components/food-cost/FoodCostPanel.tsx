"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  Pencil,
  Plus,
  ShoppingBag,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import {
  EMPTY_FOOD_COST_FORM,
  OBJETIVO_FOOD_COST_DEFAULT,
  PROYECCION_VENTAS,
  computeMetrics,
  genId,
  generarAlertas,
  generarSugerenciasAI,
  getRegistroMes,
  loadFoodCost,
  mesLabel,
  parseFoodCostForm,
  registroToForm,
  saveFoodCost,
  type FoodCostForm,
} from "@/lib/food-cost/helpers";
import { FoodCostStore, RegistroFoodCost } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type Tab = "resumen" | "alertas" | "ai";
type ModalKind = "registro" | "objetivo" | "confirm" | null;

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

const alertaIcono = {
  success: CheckCircle2,
  warning: AlertTriangle,
  danger: AlertTriangle,
  info: AlertTriangle,
};

export function FoodCostPanel() {
  const [store, setStore] = useState<FoodCostStore>(() => ({
    objetivoFoodCostPct: OBJETIVO_FOOD_COST_DEFAULT,
    registros: [],
  }));
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("resumen");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FoodCostForm>(EMPTY_FOOD_COST_FORM);
  const [objetivoDraft, setObjetivoDraft] = useState(String(OBJETIVO_FOOD_COST_DEFAULT));

  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth();

  useEffect(() => {
    try {
      setStore(loadFoodCost());
    } finally {
      setLoaded(true);
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2500);
  }, []);

  const persist = useCallback((next: FoodCostStore) => {
    setStore(next);
    saveFoodCost(next);
  }, []);

  const registroActual = useMemo(
    () => getRegistroMes(store.registros, year, month),
    [store.registros, year, month],
  );

  const metrics = useMemo(
    () => computeMetrics(registroActual, store.objetivoFoodCostPct),
    [registroActual, store.objetivoFoodCostPct],
  );

  const alertas = useMemo(() => generarAlertas(metrics), [metrics]);
  const sugerencias = useMemo(() => generarSugerenciasAI(metrics), [metrics]);

  const mesActualLabel = registroActual
    ? mesLabel(registroActual.mes)
    : now.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  const openRegistroModal = (mode: "add" | "edit", id?: string) => {
    setEditId(mode === "edit" ? (id ?? null) : null);
    if (mode === "edit" && id) {
      const r = store.registros.find((x) => x.id === id);
      if (r) setForm(registroToForm(r));
    } else {
      setForm(EMPTY_FOOD_COST_FORM);
    }
    setModal("registro");
  };

  const handleSaveRegistro = () => {
    const parsed = parseFoodCostForm(form);
    if (!parsed) {
      showToast("Completa ventas y compras");
      return;
    }

    const existing = store.registros.find((r) => r.mes === parsed.mes);
    let nextRegistros: RegistroFoodCost[];

    if (editId) {
      nextRegistros = store.registros.map((r) =>
        r.id === editId ? { ...parsed, id: editId } : r,
      );
    } else if (existing) {
      showToast("Ya existe un registro para ese mes");
      return;
    } else {
      nextRegistros = [...store.registros, { ...parsed, id: genId() }];
    }

    persist({ ...store, registros: nextRegistros });
    setModal(null);
    showToast(editId ? "Mes actualizado" : "Mes registrado");
  };

  const handleSaveObjetivo = () => {
    const pct = parseFloat(objetivoDraft) || OBJETIVO_FOOD_COST_DEFAULT;
    persist({ ...store, objetivoFoodCostPct: Math.min(100, Math.max(1, pct)) });
    setModal(null);
    showToast("Objetivo actualizado");
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "alertas", label: "Alertas" },
    { id: "ai", label: "AI Gerente" },
  ];

  const diferenciaColor =
    metrics.diferenciaObjetivo <= 0 ? "text-emerald-600" : "text-red-600";

  if (!loaded) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-gray-500">
        Cargando Food Cost…
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Food Cost Center"
        description={`Control coste comida buffet · ${mesActualLabel}`}
      >
        <Button
          size="sm"
          variant="secondary"
          className="gap-1.5"
          onClick={() => {
            setObjetivoDraft(String(store.objetivoFoodCostPct));
            setModal("objetivo");
          }}
        >
          <Target className="h-4 w-4" />
          Objetivo
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => openRegistroModal("add")}>
          <Plus className="h-4 w-4" />
          Mes
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
        <StatCard
          title="Ventas mes"
          value={formatCurrency(metrics.ventas)}
          icon={TrendingUp}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Compras mes"
          value={formatCurrency(metrics.compras)}
          subtitle={`Máx. ${formatCurrency(metrics.comprasMaxRecomendadas)}`}
          icon={ShoppingBag}
          iconColor="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Food Cost %"
          value={`${metrics.foodCostPct}%`}
          subtitle={`Objetivo ${metrics.objetivoFoodCostPct}%`}
          trend={metrics.diferenciaObjetivo <= 0 ? "En objetivo" : `+${metrics.diferenciaObjetivo} pp`}
          trendUp={metrics.diferenciaObjetivo <= 0}
          icon={Target}
          iconColor={
            metrics.foodCostPct <= metrics.objetivoFoodCostPct
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-600"
          }
        />
        <StatCard
          title="Coste / cliente"
          value={formatCurrency(metrics.costePorCliente)}
          subtitle={`Obj. ${formatCurrency(metrics.costePorClienteObjetivo)}`}
          icon={Users}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Objetivo Food Cost"
          value={`${metrics.objetivoFoodCostPct}%`}
          icon={Target}
          iconColor="bg-karuma-50 text-karuma-600"
        />
        <StatCard
          title="Diferencia objetivo"
          value={`${metrics.diferenciaObjetivo > 0 ? "+" : ""}${metrics.diferenciaObjetivo} pp`}
          subtitle={
            metrics.ahorroNecesario > 0
              ? `Ahorro ${formatCurrency(metrics.ahorroNecesario)}`
              : "Dentro de rango"
          }
          icon={metrics.diferenciaObjetivo <= 0 ? TrendingDown : TrendingUp}
          iconColor={
            metrics.diferenciaObjetivo <= 0
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-600"
          }
        />
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`shrink-0 rounded-lg px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
              tab === t.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.id === "ai" && <Bot className="mr-1.5 inline h-4 w-4" />}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "resumen" && (
        <div className="space-y-4">
          <Card title="Indicadores de control">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Food Cost % (Compras / Ventas)</span>
                <span className={`font-bold ${diferenciaColor}`}>{metrics.foodCostPct}%</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Coste comida por cliente</span>
                <span className="font-semibold">{formatCurrency(metrics.costePorCliente)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Compras máximas recomendadas</span>
                <span className="font-semibold text-emerald-700">
                  {formatCurrency(metrics.comprasMaxRecomendadas)}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Ahorro necesario</span>
                <span className="font-semibold text-red-600">
                  {metrics.ahorroNecesario > 0
                    ? formatCurrency(metrics.ahorroNecesario)
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Clientes del mes</span>
                <span className="font-semibold">{metrics.clientes.toLocaleString("es-ES")}</span>
              </div>
            </div>
          </Card>

          <Card title={`Proyección si ventas llegan a ${PROYECCION_VENTAS.toLocaleString("es-ES")} €`}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-xs text-gray-500">Manteniendo Food Cost actual</p>
                <p className="mt-1 text-lg font-bold text-gray-900">
                  {formatCurrency(metrics.proyeccionCompras100k)}
                </p>
                <p className="text-xs text-gray-500">
                  Food Cost {metrics.proyeccionFoodCost100k}%
                </p>
              </div>
              <div className="rounded-lg bg-karuma-50 p-4">
                <p className="text-xs text-karuma-700">Al objetivo {metrics.objetivoFoodCostPct}%</p>
                <p className="mt-1 text-lg font-bold text-karuma-900">
                  {formatCurrency(metrics.comprasObjetivo100k)}
                </p>
                <p className="text-xs text-karuma-700">
                  {metrics.excesoCompras > 0
                    ? `Exceso vs objetivo: ${formatCurrency(metrics.excesoCompras)}`
                    : "Compras alineadas al objetivo"}
                </p>
              </div>
            </div>
          </Card>

          {store.registros.length > 0 && (
            <Card title="Historial mensual">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs text-gray-500">
                      <th className="pb-2 pr-4">Mes</th>
                      <th className="pb-2 pr-4">Ventas</th>
                      <th className="pb-2 pr-4">Compras</th>
                      <th className="pb-2 pr-4">FC %</th>
                      <th className="pb-2"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {store.registros
                      .slice()
                      .sort((a, b) => b.mes.localeCompare(a.mes))
                      .map((r) => {
                        const fc = fmtPct(r);
                        return (
                          <tr key={r.id} className="border-b border-gray-50">
                            <td className="py-2.5 pr-4 font-medium">{mesLabel(r.mes)}</td>
                            <td className="py-2.5 pr-4">{formatCurrency(r.ventas)}</td>
                            <td className="py-2.5 pr-4">{formatCurrency(r.compras)}</td>
                            <td className="py-2.5 pr-4">{fc}%</td>
                            <td className="py-2.5">
                              <button
                                type="button"
                                onClick={() => openRegistroModal("edit", r.id)}
                                className="rounded p-1 text-gray-400 hover:bg-gray-100"
                                aria-label="Editar"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === "alertas" && (
        <div className="space-y-3">
          {alertas.map((a) => {
            const Icon = alertaIcono[a.tipo];
            return (
              <div
                key={a.id}
                className={`flex gap-3 rounded-xl border p-4 ${
                  a.activa ? sugerenciaStyles[a.tipo] : "border-gray-100 bg-gray-50 opacity-80"
                }`}
              >
                <Icon className="mt-0.5 h-5 w-5 shrink-0" />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold">{a.titulo}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                        a.activa ? "bg-white/60" : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {a.activa ? "Activa" : "OK"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed opacity-90">{a.mensaje}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "ai" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Recomendaciones para controlar sushi, salmón, atún, arroz y bebida.
          </p>
          {sugerencias.map((s) => (
            <div
              key={s.id}
              className={`rounded-xl border p-4 ${sugerenciaStyles[s.tipo]}`}
            >
              <h3 className="mb-1 font-semibold">{s.titulo}</h3>
              <p className="text-sm leading-relaxed opacity-90">{s.mensaje}</p>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modal === "registro"}
        title={editId ? "Editar mes" : "Registrar mes"}
        onClose={() => setModal(null)}
      >
        <div className="space-y-3">
          <Field label="Mes" required>
            <input
              type="month"
              className={inputClass}
              value={form.mes}
              onChange={(e) => setForm({ ...form, mes: e.target.value })}
            />
          </Field>
          <Field label="Ventas (€)" required>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.ventas}
              onChange={(e) => setForm({ ...form, ventas: e.target.value })}
            />
          </Field>
          <Field label="Clientes" required>
            <input
              type="number"
              className={inputClass}
              value={form.clientes}
              onChange={(e) => setForm({ ...form, clientes: e.target.value })}
            />
          </Field>
          <Field label="Compras (€)" required>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={form.compras}
              onChange={(e) => setForm({ ...form, compras: e.target.value })}
            />
          </Field>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSaveRegistro}>
              Guardar
            </Button>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "objetivo"} title="Objetivo Food Cost" onClose={() => setModal(null)}>
        <div className="space-y-3">
          <Field label="Objetivo Food Cost (%)">
            <input
              type="number"
              step="0.1"
              min="1"
              max="100"
              className={inputClass}
              value={objetivoDraft}
              onChange={(e) => setObjetivoDraft(e.target.value)}
            />
          </Field>
          <p className="text-xs text-gray-500">
            Estándar hostelería buffet: 28-30%. Por debajo de 28% es excelente.
          </p>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSaveObjetivo}>
              Guardar
            </Button>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function fmtPct(r: RegistroFoodCost): string {
  return r.ventas > 0 ? ((r.compras / r.ventas) * 100).toFixed(1) : "0";
}
