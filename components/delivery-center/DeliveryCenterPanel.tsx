"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  Pencil,
  Plus,
  Receipt,
  ShoppingBag,
  Trash2,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import {
  COMISION_GLOVO_DEFAULT,
  COMISION_UBER_DEFAULT,
  EMPTY_MES_FORM,
  EMPTY_PEDIDO_FORM,
  computeMetrics,
  genId,
  generarSugerenciasAI,
  loadDelivery,
  mesLabel,
  parseMesForm,
  parsePedidoForm,
  pedidoToForm,
  registroToForm,
  saveDelivery,
  type MesForm,
  type PedidoForm,
} from "@/lib/delivery-center/helpers";
import { DeliveryStore, PedidoDeliveryCenter, RegistroDeliveryMes } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";

type Tab = "resumen" | "pedidos" | "ai";
type ModalKind = "pedido" | "mes" | "config" | "confirm" | null;

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

const plataformaBadge = {
  "Uber Eats": "bg-gray-900 text-white",
  Glovo: "bg-yellow-400 text-gray-900",
};

export function DeliveryCenterPanel() {
  const [store, setStore] = useState<DeliveryStore>(() => ({
    comisionUberPct: COMISION_UBER_DEFAULT,
    comisionGlovoPct: COMISION_GLOVO_DEFAULT,
    costeComidaPct: 32,
    registros: [],
    pedidos: [],
  }));
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("resumen");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [pedidoForm, setPedidoForm] = useState<PedidoForm>(EMPTY_PEDIDO_FORM);
  const [mesForm, setMesForm] = useState<MesForm>(EMPTY_MES_FORM);
  const [configDraft, setConfigDraft] = useState({
    comisionUberPct: String(COMISION_UBER_DEFAULT),
    comisionGlovoPct: String(COMISION_GLOVO_DEFAULT),
    costeComidaPct: "32",
  });
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    try {
      setStore(loadDelivery());
    } finally {
      setLoaded(true);
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2500);
  }, []);

  const persist = useCallback((next: DeliveryStore) => {
    setStore(next);
    saveDelivery(next);
  }, []);

  const metrics = useMemo(() => computeMetrics(store, now), [store, now]);
  const sugerencias = useMemo(() => generarSugerenciasAI(metrics), [metrics]);

  const mesActualLabel = useMemo(() => {
    const year = now.getFullYear();
    const month = now.getMonth();
    const key = `${year}-${String(month + 1).padStart(2, "0")}`;
    const reg = store.registros.find((r) => r.mes === key);
    return reg ? mesLabel(reg.mes) : now.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
  }, [store.registros, now]);

  const openPedidoModal = (mode: "add" | "edit", id?: string) => {
    setEditId(mode === "edit" ? (id ?? null) : null);
    if (mode === "edit" && id) {
      const p = store.pedidos.find((x) => x.id === id);
      if (p) setPedidoForm(pedidoToForm(p));
    } else {
      setPedidoForm(EMPTY_PEDIDO_FORM);
    }
    setModal("pedido");
  };

  const openMesModal = (mode: "add" | "edit", id?: string) => {
    setEditId(mode === "edit" ? (id ?? null) : null);
    if (mode === "edit" && id) {
      const r = store.registros.find((x) => x.id === id);
      if (r) setMesForm(registroToForm(r));
    } else {
      setMesForm(EMPTY_MES_FORM);
    }
    setModal("mes");
  };

  const openConfigModal = () => {
    setConfigDraft({
      comisionUberPct: String(store.comisionUberPct),
      comisionGlovoPct: String(store.comisionGlovoPct),
      costeComidaPct: String(store.costeComidaPct),
    });
    setModal("config");
  };

  const handleSavePedido = () => {
    const parsed = parsePedidoForm(pedidoForm);
    if (!parsed) {
      showToast("Completa los campos del pedido");
      return;
    }

    let nextPedidos: PedidoDeliveryCenter[];
    if (editId) {
      nextPedidos = store.pedidos.map((p) =>
        p.id === editId ? { ...parsed, id: editId } : p,
      );
    } else {
      nextPedidos = [{ ...parsed, id: genId() }, ...store.pedidos];
    }

    persist({ ...store, pedidos: nextPedidos });
    setModal(null);
    showToast(editId ? "Pedido actualizado" : "Pedido añadido");
  };

  const handleSaveMes = () => {
    const parsed = parseMesForm(mesForm);
    if (!parsed) {
      showToast("Completa los campos del mes");
      return;
    }

    const existing = store.registros.find((r) => r.mes === parsed.mes);
    let nextRegistros: RegistroDeliveryMes[];

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

  const handleSaveConfig = () => {
    persist({
      ...store,
      comisionUberPct: parseFloat(configDraft.comisionUberPct) || COMISION_UBER_DEFAULT,
      comisionGlovoPct: parseFloat(configDraft.comisionGlovoPct) || COMISION_GLOVO_DEFAULT,
      costeComidaPct: parseFloat(configDraft.costeComidaPct) || 32,
    });
    setModal(null);
    showToast("Comisiones actualizadas");
  };

  const confirmDelete = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setModal("confirm");
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "pedidos", label: "Pedidos" },
    { id: "ai", label: "AI Rentabilidad" },
  ];

  if (!loaded) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-gray-500">
        Cargando Delivery Center…
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Delivery Center"
        description={`Uber Eats & Glovo · ${mesActualLabel}`}
      >
        <Button size="sm" variant="secondary" className="gap-1.5" onClick={openConfigModal}>
          Comisiones
        </Button>
        <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => openMesModal("add")}>
          <Plus className="h-4 w-4" />
          Mes
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => openPedidoModal("add")}>
          <Plus className="h-4 w-4" />
          Pedido
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-7">
        <StatCard
          title="Ventas Uber"
          value={formatCurrency(metrics.ventasUber)}
          subtitle={`${metrics.pedidosUber} pedidos`}
          icon={Truck}
          iconColor="bg-gray-900 text-white"
        />
        <StatCard
          title="Ventas Glovo"
          value={formatCurrency(metrics.ventasGlovo)}
          subtitle={`${metrics.pedidosGlovo} pedidos`}
          icon={Truck}
          iconColor="bg-yellow-50 text-yellow-700"
        />
        <StatCard
          title="Comisión Uber"
          value={formatCurrency(metrics.comisionUber)}
          subtitle={`${metrics.comisionUberPct}%`}
          icon={Receipt}
          iconColor="bg-red-50 text-red-600"
        />
        <StatCard
          title="Comisión Glovo"
          value={formatCurrency(metrics.comisionGlovo)}
          subtitle={`${metrics.comisionGlovoPct}%`}
          icon={Receipt}
          iconColor="bg-orange-50 text-orange-600"
        />
        <StatCard
          title="Beneficio est."
          value={formatCurrency(metrics.beneficioEstimado)}
          subtitle={`Margen ${metrics.margenPct}%`}
          trend={metrics.beneficioEstimado >= 0 ? "Positivo" : "Negativo"}
          trendUp={metrics.beneficioEstimado >= 0}
          icon={ShoppingBag}
          iconColor={
            metrics.beneficioEstimado >= 0
              ? "bg-emerald-50 text-emerald-600"
              : "bg-red-50 text-red-600"
          }
        />
        <StatCard
          title="Pedidos"
          value={String(metrics.pedidosTotal)}
          subtitle="Mes actual"
          icon={ShoppingBag}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Ticket medio"
          value={formatCurrency(metrics.ticketMedio)}
          subtitle={`Uber ${formatCurrency(metrics.ticketUber)} · Glovo ${formatCurrency(metrics.ticketGlovo)}`}
          icon={Receipt}
          iconColor="bg-karuma-50 text-karuma-600"
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
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Uber Eats">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Ventas</p>
                <p className="text-lg font-bold">{formatCurrency(metrics.ventasUber)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Comisión</p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(metrics.comisionUber)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Ticket</p>
                <p className="text-lg font-bold">{formatCurrency(metrics.ticketUber)}</p>
              </div>
            </div>
          </Card>
          <Card title="Glovo">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-gray-500">Ventas</p>
                <p className="text-lg font-bold">{formatCurrency(metrics.ventasGlovo)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Comisión</p>
                <p className="text-lg font-bold text-red-600">
                  {formatCurrency(metrics.comisionGlovo)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Ticket</p>
                <p className="text-lg font-bold">{formatCurrency(metrics.ticketGlovo)}</p>
              </div>
            </div>
          </Card>
          <Card title="Desglose rentabilidad" className="lg:col-span-2">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Ventas totales</span>
                <span className="font-semibold">{formatCurrency(metrics.ventasTotal)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Comisiones plataformas</span>
                <span className="font-semibold text-red-600">
                  −{formatCurrency(metrics.comisionTotal)}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Neto tras comisión</span>
                <span className="font-semibold">{formatCurrency(metrics.netoDespuesComision)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Coste comida ({store.costeComidaPct}%)</span>
                <span className="font-semibold text-red-600">
                  −{formatCurrency(metrics.costeComida)}
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="font-medium text-gray-900">Beneficio estimado</span>
                <span
                  className={`text-lg font-bold ${metrics.beneficioEstimado >= 0 ? "text-emerald-600" : "text-red-600"}`}
                >
                  {formatCurrency(metrics.beneficioEstimado)}
                </span>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === "pedidos" && (
        <div className="space-y-2 sm:space-y-3">
          {store.pedidos.length === 0 ? (
            <p className="text-sm text-gray-500">No hay pedidos registrados.</p>
          ) : (
            store.pedidos.map((p) => (
              <article
                key={p.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3.5 shadow-sm sm:p-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-gray-900">{p.id}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${plataformaBadge[p.plataforma]}`}
                    >
                      {p.plataforma}
                    </span>
                    <span className="text-xs text-gray-400">{formatDate(p.fecha)}</span>
                  </div>
                  <p className="mt-1 text-sm font-medium text-gray-800">
                    {formatCurrency(p.importe)} · {p.estado}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => openPedidoModal("edit", p.id)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      confirmDelete(`¿Eliminar pedido ${p.id}?`, () => {
                        persist({
                          ...store,
                          pedidos: store.pedidos.filter((x) => x.id !== p.id),
                        });
                        setModal(null);
                        showToast("Pedido eliminado");
                      })
                    }
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {tab === "ai" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Análisis de rentabilidad delivery — Uber Eats vs Glovo.
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
        open={modal === "pedido"}
        title={editId ? "Editar pedido" : "Nuevo pedido"}
        onClose={() => setModal(null)}
      >
        <div className="space-y-3">
          <Field label="Fecha" required>
            <input
              type="date"
              className={inputClass}
              value={pedidoForm.fecha}
              onChange={(e) => setPedidoForm({ ...pedidoForm, fecha: e.target.value })}
            />
          </Field>
          <Field label="Plataforma" required>
            <select
              className={inputClass}
              value={pedidoForm.plataforma}
              onChange={(e) =>
                setPedidoForm({
                  ...pedidoForm,
                  plataforma: e.target.value as PedidoForm["plataforma"],
                })
              }
            >
              <option value="Uber Eats">Uber Eats</option>
              <option value="Glovo">Glovo</option>
            </select>
          </Field>
          <Field label="Importe (€)" required>
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={pedidoForm.importe}
              onChange={(e) => setPedidoForm({ ...pedidoForm, importe: e.target.value })}
            />
          </Field>
          <Field label="Estado">
            <select
              className={inputClass}
              value={pedidoForm.estado}
              onChange={(e) =>
                setPedidoForm({
                  ...pedidoForm,
                  estado: e.target.value as PedidoForm["estado"],
                })
              }
            >
              <option value="entregado">Entregado</option>
              <option value="en camino">En camino</option>
              <option value="preparando">Preparando</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </Field>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSavePedido}>
              Guardar
            </Button>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "mes"} title="Registro mensual" onClose={() => setModal(null)}>
        <div className="space-y-3">
          <Field label="Mes" required>
            <input
              type="month"
              className={inputClass}
              value={mesForm.mes}
              onChange={(e) => setMesForm({ ...mesForm, mes: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ventas Uber (€)">
              <input
                type="number"
                className={inputClass}
                value={mesForm.ventasUber}
                onChange={(e) => setMesForm({ ...mesForm, ventasUber: e.target.value })}
              />
            </Field>
            <Field label="Ventas Glovo (€)">
              <input
                type="number"
                className={inputClass}
                value={mesForm.ventasGlovo}
                onChange={(e) => setMesForm({ ...mesForm, ventasGlovo: e.target.value })}
              />
            </Field>
            <Field label="Pedidos Uber">
              <input
                type="number"
                className={inputClass}
                value={mesForm.pedidosUber}
                onChange={(e) => setMesForm({ ...mesForm, pedidosUber: e.target.value })}
              />
            </Field>
            <Field label="Pedidos Glovo">
              <input
                type="number"
                className={inputClass}
                value={mesForm.pedidosGlovo}
                onChange={(e) => setMesForm({ ...mesForm, pedidosGlovo: e.target.value })}
              />
            </Field>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSaveMes}>
              Guardar
            </Button>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "config"} title="Comisiones y costes" onClose={() => setModal(null)}>
        <div className="space-y-3">
          <Field label="Comisión Uber Eats (%)">
            <input
              type="number"
              step="0.1"
              className={inputClass}
              value={configDraft.comisionUberPct}
              onChange={(e) =>
                setConfigDraft({ ...configDraft, comisionUberPct: e.target.value })
              }
            />
          </Field>
          <Field label="Comisión Glovo (%)">
            <input
              type="number"
              step="0.1"
              className={inputClass}
              value={configDraft.comisionGlovoPct}
              onChange={(e) =>
                setConfigDraft({ ...configDraft, comisionGlovoPct: e.target.value })
              }
            />
          </Field>
          <Field label="Coste comida (% ventas)">
            <input
              type="number"
              step="0.1"
              className={inputClass}
              value={configDraft.costeComidaPct}
              onChange={(e) =>
                setConfigDraft({ ...configDraft, costeComidaPct: e.target.value })
              }
            />
          </Field>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSaveConfig}>
              Guardar
            </Button>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal open={modal === "confirm"} title="Confirmar" onClose={() => setModal(null)}>
        <p className="mb-4 text-sm text-gray-600">{confirmMessage}</p>
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
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
