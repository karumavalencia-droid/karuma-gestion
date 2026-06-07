"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  CalendarDays,
  Pencil,
  Plus,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
  Wine,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import {
  EMPTY_REGISTRO_FORM,
  computeMetrics,
  genId,
  generarSugerenciasAI,
  getMejorPeorDia,
  getRegistrosMes,
  getTendenciaSemanal,
  loadObjetivo,
  parseRegistroForm,
  registroToForm,
  saveObjetivo,
  type RegistroForm,
} from "@/lib/objetivo/helpers";
import { RegistroDiario } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type Tab = "registro" | "tendencias" | "ai";
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

function BarChart({
  items,
  maxValue,
}: {
  items: { label: string; value: number }[];
  maxValue: number;
}) {
  const max = maxValue || 1;

  return (
    <div className="space-y-2">
      {items.map((item, i) => {
        const pct = Math.max(4, (item.value / max) * 100);
        return (
          <div key={i}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="truncate text-gray-600">{item.label}</span>
              <span className="ml-2 shrink-0 font-medium text-gray-900">
                {formatCurrency(item.value)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-karuma-600 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ObjetivoPanel() {
  const [objetivoMensual, setObjetivoMensual] = useState(100_000);
  const [registros, setRegistros] = useState<RegistroDiario[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("registro");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<RegistroForm>(EMPTY_REGISTRO_FORM);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const now = useMemo(() => new Date(), []);
  const year = now.getFullYear();
  const month = now.getMonth();

  useEffect(() => {
    try {
      const store = loadObjetivo();
      setObjetivoMensual(store.objetivoMensual);
      setRegistros(store.registros);
    } finally {
      setLoaded(true);
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2500);
  }, []);

  const persist = useCallback(
    (nextRegistros: RegistroDiario[]) => {
      setRegistros(nextRegistros);
      saveObjetivo({ objetivoMensual, registros: nextRegistros });
    },
    [objetivoMensual],
  );

  const store = useMemo(
    () => ({ objetivoMensual, registros }),
    [objetivoMensual, registros],
  );

  const metrics = useMemo(() => computeMetrics(store, now), [store, now]);
  const registrosMes = useMemo(
    () => getRegistrosMes(registros, year, month),
    [registros, year, month],
  );
  const tendenciaSemanal = useMemo(
    () => getTendenciaSemanal(registros, year, month),
    [registros, year, month],
  );
  const { mejor, peor } = useMemo(() => getMejorPeorDia(registrosMes), [registrosMes]);
  const sugerencias = useMemo(
    () => generarSugerenciasAI(metrics, registrosMes),
    [metrics, registrosMes],
  );

  const mesLabel = now.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  const openRegistroModal = (mode: "add" | "edit", id?: string) => {
    setEditId(mode === "edit" ? (id ?? null) : null);
    if (mode === "edit" && id) {
      const reg = registros.find((r) => r.id === id);
      if (reg) setForm(registroToForm(reg));
    } else {
      setForm(EMPTY_REGISTRO_FORM);
    }
    setModal("registro");
  };

  const saveRegistro = () => {
    const parsed = parseRegistroForm(form);
    if (!parsed) {
      showToast("Completa fecha y facturación");
      return;
    }

    const duplicado = registros.find(
      (r) => r.fecha === parsed.fecha && r.id !== editId,
    );
    if (duplicado) {
      showToast("Ya existe un registro para esa fecha");
      return;
    }

    if (editId) {
      persist(
        registros.map((r) => (r.id === editId ? { ...r, ...parsed } : r)),
      );
      showToast("Registro actualizado");
    } else {
      persist([...registros, { id: genId(), ...parsed }]);
      showToast("Registro añadido");
    }

    setModal(null);
    setForm(EMPTY_REGISTRO_FORM);
    setEditId(null);
  };

  const confirmDelete = (id: string) => {
    const reg = registros.find((r) => r.id === id);
    if (!reg) return;
    setConfirmMessage(`¿Eliminar registro del ${formatDate(reg.fecha)}?`);
    setConfirmAction(() => () => {
      persist(registros.filter((r) => r.id !== id));
      setModal(null);
      showToast("Registro eliminado");
    });
    setModal("confirm");
  };

  const updateForm = (field: keyof RegistroForm, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === "facturacion" || field === "clientes") {
        const fact = parseFloat(field === "facturacion" ? value : prev.facturacion) || 0;
        const cli = parseInt(field === "clientes" ? value : prev.clientes, 10) || 0;
        if (fact > 0 && cli > 0 && !prev.ticketMedio) {
          next.ticketMedio = (fact / cli).toFixed(2);
        }
      }
      return next;
    });
  };

  const chartMax = useMemo(
    () => Math.max(...registrosMes.map((r) => r.facturacion), 1),
    [registrosMes],
  );

  return (
    <div>
      <PageHeader
        title="Objetivo 100K"
        description={`Seguimiento mensual · ${mesLabel}`}
      >
        <Button size="sm" className="gap-1.5" onClick={() => openRegistroModal("add")}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo registro</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </PageHeader>

      {/* Progreso principal */}
      <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:mb-6 sm:p-5">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
              Objetivo mensual
            </p>
            <p className="text-2xl font-bold text-gray-900 sm:text-3xl">
              {formatCurrency(metrics.objetivoMensual)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Completado</p>
            <p className="text-2xl font-bold text-karuma-600 sm:text-3xl">
              {metrics.porcentajeCompletado}%
            </p>
          </div>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full bg-karuma-600 transition-all"
            style={{ width: `${Math.min(100, metrics.porcentajeCompletado)}%` }}
          />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
          <div>
            <p className="text-xs text-gray-500">Facturación actual</p>
            <p className="font-semibold text-gray-900">
              {formatCurrency(metrics.facturacionActual)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Proyección mensual</p>
            <p className="font-semibold text-gray-900">
              {formatCurrency(metrics.proyeccionMensual)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Diferencia al objetivo</p>
            <p
              className={`font-semibold ${metrics.diferenciaObjetivo <= 0 ? "text-emerald-600" : "text-amber-700"}`}
            >
              {metrics.diferenciaObjetivo <= 0
                ? `+${formatCurrency(Math.abs(metrics.diferenciaObjetivo))}`
                : `-${formatCurrency(metrics.diferenciaObjetivo)}`}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Probabilidad objetivo</p>
            <p className="font-semibold text-gray-900">{metrics.probabilidadObjetivo}%</p>
          </div>
        </div>
      </div>

      {/* KPIs calculados */}
      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:grid-cols-3 lg:grid-cols-6 sm:gap-4">
        <StatCard
          title="Promedio diario"
          value={formatCurrency(metrics.promedioDiario)}
          icon={Target}
          iconColor="bg-karuma-50 text-karuma-600"
        />
        <StatCard
          title="Clientes/día"
          value={String(metrics.promedioClientesDia)}
          icon={Users}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Ticket medio"
          value={formatCurrency(metrics.ticketMedioGlobal)}
          icon={TrendingUp}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="€/día necesarios"
          value={formatCurrency(metrics.facturacionDiariaNecesaria)}
          subtitle={`${metrics.diasRestantes} días rest.`}
          icon={CalendarDays}
          iconColor="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Clientes/día obj."
          value={String(metrics.clientesNecesariosPorDia)}
          icon={Users}
          iconColor="bg-purple-50 text-purple-600"
        />
        <StatCard
          title="Bebidas"
          value={`${metrics.ratioBebidas}%`}
          subtitle={formatCurrency(metrics.totalBebidas)}
          icon={Wine}
          iconColor="bg-rose-50 text-rose-600"
        />
      </div>

      {/* Tabs */}
      <div className="mb-4 flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        {(
          [
            { id: "registro", label: "Registro", icon: CalendarDays },
            { id: "tendencias", label: "Tendencias", icon: TrendingUp },
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

      {tab === "registro" && (
        <>
          {!loaded ? (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
              Cargando datos…
            </div>
          ) : registrosMes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
              Sin registros este mes. Pulsa Nuevo registro.
            </div>
          ) : (
            <div className="space-y-3">
              {registrosMes.map((reg) => (
                <article
                  key={reg.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{formatDate(reg.fecha)}</h3>
                      {reg.observaciones && (
                        <p className="text-xs text-gray-500">{reg.observaciones}</p>
                      )}
                    </div>
                    <p className="text-lg font-bold text-karuma-600">
                      {formatCurrency(reg.facturacion)}
                    </p>
                  </div>

                  <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                    <div>
                      <dt className="text-xs text-gray-500">Clientes</dt>
                      <dd className="font-medium text-gray-900">{reg.clientes}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Ticket medio</dt>
                      <dd className="font-medium text-gray-900">
                        {formatCurrency(reg.ticketMedio)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Bebidas</dt>
                      <dd className="font-medium text-gray-900">{formatCurrency(reg.bebidas)}</dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => openRegistroModal("edit", reg.id)}
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
              ))}
            </div>
          )}
        </>
      )}

      {tab === "tendencias" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {mejor && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-emerald-700">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-semibold">Mejor día</span>
                </div>
                <p className="text-lg font-bold text-emerald-900">
                  {formatCurrency(mejor.facturacion)}
                </p>
                <p className="text-xs text-emerald-700">
                  {formatDate(mejor.fecha)} · {mejor.clientes} clientes
                </p>
              </div>
            )}
            {peor && registrosMes.length > 1 && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <div className="mb-2 flex items-center gap-2 text-red-700">
                  <TrendingDown className="h-4 w-4" />
                  <span className="text-sm font-semibold">Peor día</span>
                </div>
                <p className="text-lg font-bold text-red-900">
                  {formatCurrency(peor.facturacion)}
                </p>
                <p className="text-xs text-red-700">
                  {formatDate(peor.fecha)} · {peor.clientes} clientes
                </p>
              </div>
            )}
          </div>

          <Card title="Historial diario">
            {registrosMes.length === 0 ? (
              <p className="text-sm text-gray-500">Sin datos para mostrar.</p>
            ) : (
              <BarChart
                items={registrosMes.map((r) => ({
                  label: formatDate(r.fecha),
                  value: r.facturacion,
                }))}
                maxValue={chartMax}
              />
            )}
          </Card>

          <Card title="Tendencia semanal">
            <BarChart
              items={tendenciaSemanal
                .filter((s) => s.dias > 0)
                .map((s) => ({ label: s.semana, value: s.facturacion }))}
              maxValue={Math.max(...tendenciaSemanal.map((s) => s.facturacion), 1)}
            />
            {tendenciaSemanal.every((s) => s.dias === 0) && (
              <p className="text-sm text-gray-500">Aún no hay datos semanales.</p>
            )}
          </Card>
        </div>
      )}

      {tab === "ai" && (
        <div className="space-y-3">
          <div className="rounded-xl border border-karuma-200 bg-karuma-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Bot className="h-5 w-5 text-karuma-600" />
              <h3 className="font-semibold text-karuma-900">Análisis AI Gerente</h3>
            </div>
            <p className="text-sm text-karuma-800">
              Recomendaciones basadas en los datos de facturación de {mesLabel}.
            </p>
          </div>

          {sugerencias.map((s) => (
            <div
              key={s.id}
              className={`rounded-xl border p-4 ${sugerenciaStyles[s.tipo]}`}
            >
              <p className="font-semibold">{s.titulo}</p>
              <p className="mt-1 text-sm leading-relaxed opacity-90">{s.mensaje}</p>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modal === "registro"}
        title={editId ? "Editar registro" : "Nuevo registro diario"}
        onClose={() => setModal(null)}
      >
        <div className="space-y-4">
          <Field label="Fecha" required>
            <input
              type="date"
              value={form.fecha}
              onChange={(e) => updateForm("fecha", e.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Facturación €" required>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.facturacion}
                onChange={(e) => updateForm("facturacion", e.target.value)}
                placeholder="3908.20"
                className={inputClass}
              />
            </Field>
            <Field label="Clientes" required>
              <input
                type="number"
                min="0"
                step="1"
                value={form.clientes}
                onChange={(e) => updateForm("clientes", e.target.value)}
                placeholder="153"
                className={inputClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Ticket medio €">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.ticketMedio}
                onChange={(e) => updateForm("ticketMedio", e.target.value)}
                placeholder="Auto si vacío"
                className={inputClass}
              />
            </Field>
            <Field label="Bebidas €">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.bebidas}
                onChange={(e) => updateForm("bebidas", e.target.value)}
                placeholder="586.23"
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="Observaciones">
            <textarea
              value={form.observaciones}
              onChange={(e) => updateForm("observaciones", e.target.value)}
              placeholder="Ej. Restosuite, evento especial…"
              rows={2}
              className={inputClass}
            />
          </Field>
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
