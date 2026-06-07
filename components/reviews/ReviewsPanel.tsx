"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bot,
  MessageSquare,
  Pencil,
  Plus,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatCard } from "@/components/ui/StatCard";
import {
  EMPTY_MES_FORM,
  EMPTY_RESENA_FORM,
  OBJETIVO_RESENAS,
  computeMetrics,
  genId,
  generarSugerenciasAI,
  loadReviews,
  mesLabel,
  parseMesForm,
  parseResenaForm,
  registroMesToForm,
  resenaToForm,
  saveReviews,
  type MesForm,
  type ResenaForm,
} from "@/lib/reviews/helpers";
import { RegistroMensualReviews, ResenaReview } from "@/lib/types";
import { formatDate } from "@/lib/utils";

type Tab = "resumen" | "evolucion" | "resenas" | "ai";
type ModalKind = "resena" | "mes" | "confirm" | null;

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

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={`h-3.5 w-3.5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
        />
      ))}
    </span>
  );
}

function BarChart({
  items,
  maxValue,
  valueFormatter,
}: {
  items: { label: string; value: number; sub?: string }[];
  maxValue: number;
  valueFormatter?: (v: number) => string;
}) {
  const max = maxValue || 1;
  const fmt = valueFormatter ?? ((v: number) => String(v));

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const pct = Math.max(4, (item.value / max) * 100);
        return (
          <div key={i}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="truncate text-gray-600">{item.label}</span>
              <span className="ml-2 shrink-0 font-medium text-gray-900">
                {fmt(item.value)}
                {item.sub && (
                  <span className="ml-1 font-normal text-gray-500">{item.sub}</span>
                )}
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

export function ReviewsPanel() {
  const [store, setStore] = useState(() => ({
    objetivoResenas: OBJETIVO_RESENAS,
    ratingActual: 4.9,
    totalResenas: 431,
    registrosMensuales: [] as RegistroMensualReviews[],
    resenas: [] as ResenaReview[],
  }));
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("resumen");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [resenaForm, setResenaForm] = useState<ResenaForm>(EMPTY_RESENA_FORM);
  const [mesForm, setMesForm] = useState<MesForm>(EMPTY_MES_FORM);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    try {
      setStore(loadReviews());
    } finally {
      setLoaded(true);
    }
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2500);
  }, []);

  const persist = useCallback((next: typeof store) => {
    setStore(next);
    saveReviews(next);
  }, []);

  const metrics = useMemo(() => computeMetrics(store, now), [store, now]);
  const sugerencias = useMemo(() => generarSugerenciasAI(metrics), [metrics]);

  const maxResenas = useMemo(
    () => Math.max(...metrics.evolucionMensual.map((e) => e.totalResenas), 1),
    [metrics.evolucionMensual],
  );

  const openResenaModal = (mode: "add" | "edit", id?: string) => {
    setEditId(mode === "edit" ? (id ?? null) : null);
    if (mode === "edit" && id) {
      const r = store.resenas.find((x) => x.id === id);
      if (r) setResenaForm(resenaToForm(r));
    } else {
      setResenaForm(EMPTY_RESENA_FORM);
    }
    setModal("resena");
  };

  const openMesModal = (mode: "add" | "edit", id?: string) => {
    setEditId(mode === "edit" ? (id ?? null) : null);
    if (mode === "edit" && id) {
      const r = store.registrosMensuales.find((x) => x.id === id);
      if (r) setMesForm(registroMesToForm(r));
    } else {
      setMesForm(EMPTY_MES_FORM);
    }
    setModal("mes");
  };

  const handleSaveResena = () => {
    const parsed = parseResenaForm(resenaForm);
    if (!parsed) {
      showToast("Completa los campos obligatorios");
      return;
    }

    let nextResenas: ResenaReview[];
    if (editId) {
      nextResenas = store.resenas.map((r) =>
        r.id === editId ? { ...parsed, id: editId } : r,
      );
    } else {
      nextResenas = [{ ...parsed, id: genId() }, ...store.resenas];
    }

    const ultimoMes = store.registrosMensuales.at(-1);
    persist({
      ...store,
      resenas: nextResenas,
      totalResenas: ultimoMes?.totalResenas ?? store.totalResenas,
      ratingActual: ultimoMes?.rating ?? store.ratingActual,
    });
    setModal(null);
    showToast(editId ? "Reseña actualizada" : "Reseña añadida");
  };

  const handleSaveMes = () => {
    const parsed = parseMesForm(mesForm);
    if (!parsed) {
      showToast("Completa los campos del mes");
      return;
    }

    const existing = store.registrosMensuales.find((r) => r.mes === parsed.mes);
    let nextRegistros: RegistroMensualReviews[];

    if (editId) {
      nextRegistros = store.registrosMensuales.map((r) =>
        r.id === editId ? { ...parsed, id: editId } : r,
      );
    } else if (existing) {
      showToast("Ya existe un registro para ese mes");
      return;
    } else {
      nextRegistros = [...store.registrosMensuales, { ...parsed, id: genId() }].sort(
        (a, b) => a.mes.localeCompare(b.mes),
      );
    }

    const ultimo = [...nextRegistros].sort((a, b) => a.mes.localeCompare(b.mes)).at(-1);

    persist({
      ...store,
      registrosMensuales: nextRegistros,
      totalResenas: ultimo?.totalResenas ?? store.totalResenas,
      ratingActual: ultimo?.rating ?? store.ratingActual,
    });
    setModal(null);
    showToast(editId ? "Mes actualizado" : "Mes registrado");
  };

  const confirmDelete = (message: string, action: () => void) => {
    setConfirmMessage(message);
    setConfirmAction(() => action);
    setModal("confirm");
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: "resumen", label: "Resumen" },
    { id: "evolucion", label: "Evolución" },
    { id: "resenas", label: "Reseñas" },
    { id: "ai", label: "AI Gerente" },
  ];

  if (!loaded) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-gray-500">
        Cargando reputación…
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        title="Reviews"
        description="Control de reputación online — Google, TripAdvisor y TheFork"
      >
        <Button size="sm" variant="secondary" className="gap-1.5" onClick={() => openMesModal("add")}>
          <Plus className="h-4 w-4" />
          Mes
        </Button>
        <Button size="sm" className="gap-1.5" onClick={() => openResenaModal("add")}>
          <Plus className="h-4 w-4" />
          Reseña
        </Button>
      </PageHeader>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-8">
        <StatCard
          title="Rating actual"
          value={`${metrics.ratingActual} ★`}
          subtitle={
            metrics.variacionRating > 0
              ? `+${metrics.variacionRating} vs mes ant.`
              : "Nota media global"
          }
          trend={metrics.variacionRating > 0 ? "Subiendo" : undefined}
          trendUp={metrics.variacionRating > 0}
          icon={Star}
          iconColor="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Total reseñas"
          value={metrics.totalResenas.toLocaleString("es-ES")}
          subtitle={`Objetivo ${metrics.objetivoResenas.toLocaleString("es-ES")}`}
          icon={MessageSquare}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Progreso objetivo"
          value={`${metrics.progresoPct}%`}
          subtitle={`Faltan ${metrics.faltanResenas}`}
          icon={TrendingUp}
          iconColor="bg-karuma-50 text-karuma-600"
        />
        <StatCard
          title="Nuevas este mes"
          value={String(metrics.nuevasMesActual)}
          subtitle="Reseñas recibidas"
          icon={MessageSquare}
          iconColor="bg-violet-50 text-violet-600"
        />
        <StatCard
          title="Positivas"
          value={String(metrics.positivas)}
          subtitle={`${metrics.pctPositivas}% (4-5★)`}
          trend="Buenas"
          trendUp
          icon={ThumbsUp}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Negativas"
          value={String(metrics.negativas)}
          subtitle={`${metrics.pctNegativas}% (≤3★)`}
          icon={ThumbsDown}
          iconColor="bg-red-50 text-red-600"
        />
        <StatCard
          title="Sin responder"
          value={String(metrics.pendientesRespuesta)}
          subtitle="Respuesta pendiente"
          icon={MessageSquare}
          iconColor="bg-orange-50 text-orange-600"
        />
        <StatCard
          title="Objetivo"
          value="1.000"
          subtitle="Reseñas meta"
          icon={Star}
          iconColor="bg-gray-100 text-gray-600"
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
          <Card title="Progreso hacia 1.000 reseñas">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="text-gray-600">
                {metrics.totalResenas} / {metrics.objetivoResenas} reseñas
              </span>
              <span className="font-semibold text-karuma-600">{metrics.progresoPct}%</span>
            </div>
            <div className="h-4 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-karuma-600 transition-all"
                style={{ width: `${metrics.progresoPct}%` }}
              />
            </div>
            <p className="mt-3 text-xs text-gray-500">
              A ritmo de {metrics.nuevasMesActual} reseñas/mes, alcanzarás el objetivo en
              aproximadamente{" "}
              {Math.ceil(metrics.faltanResenas / Math.max(1, metrics.nuevasMesActual))} meses.
            </p>
          </Card>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card title="Últimas reseñas">
              <div className="space-y-3">
                {store.resenas.slice(0, 4).map((r) => (
                  <article
                    key={r.id}
                    className="rounded-lg border border-gray-100 bg-gray-50/50 p-3"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Stars rating={r.rating} />
                        <span className="text-xs font-medium text-gray-700">{r.autor}</span>
                      </div>
                      <span className="text-[10px] text-gray-400">{r.plataforma}</span>
                    </div>
                    <p className="line-clamp-2 text-xs text-gray-600">{r.texto}</p>
                    {!r.respondida && (
                      <span className="mt-1.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800">
                        Pendiente respuesta
                      </span>
                    )}
                  </article>
                ))}
              </div>
            </Card>

            <Card title="Distribución del mes">
              <div className="space-y-4">
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-emerald-700">Positivas (4-5★)</span>
                    <span className="font-medium">{metrics.positivas}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{
                        width: `${Math.max(5, (metrics.positivas / Math.max(1, metrics.positivas + metrics.negativas)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-red-700">Negativas (≤3★)</span>
                    <span className="font-medium">{metrics.negativas}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-red-400"
                      style={{
                        width: `${Math.max(5, (metrics.negativas / Math.max(1, metrics.positivas + metrics.negativas)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
                <div>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-amber-700">Sin responder</span>
                    <span className="font-medium">{metrics.pendientesRespuesta}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-amber-400"
                      style={{
                        width: `${Math.max(5, (metrics.pendientesRespuesta / Math.max(1, store.resenas.length)) * 100)}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === "evolucion" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card title="Evolución mensual — total reseñas">
            <BarChart
              items={metrics.evolucionMensual.map((e) => ({
                label: e.label,
                value: e.totalResenas,
              }))}
              maxValue={maxResenas}
            />
          </Card>
          <Card title="Evolución mensual — rating">
            <BarChart
              items={metrics.evolucionMensual.map((e) => ({
                label: e.label,
                value: e.rating,
                sub: "★",
              }))}
              maxValue={5}
              valueFormatter={(v) => `${v}★`}
            />
          </Card>
          <Card title="Nuevas reseñas por mes" className="lg:col-span-2">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-500">
                    <th className="pb-2 pr-4 font-medium">Mes</th>
                    <th className="pb-2 pr-4 font-medium">Total</th>
                    <th className="pb-2 pr-4 font-medium">Rating</th>
                    <th className="pb-2 pr-4 font-medium">Nuevas</th>
                    <th className="pb-2 pr-4 font-medium">+</th>
                    <th className="pb-2 pr-4 font-medium">−</th>
                    <th className="pb-2 font-medium">Pend.</th>
                  </tr>
                </thead>
                <tbody>
                  {store.registrosMensuales
                    .slice()
                    .sort((a, b) => b.mes.localeCompare(a.mes))
                    .map((r) => (
                      <tr key={r.id} className="border-b border-gray-50">
                        <td className="py-2.5 pr-4 font-medium text-gray-900">
                          {mesLabel(r.mes)}
                        </td>
                        <td className="py-2.5 pr-4">{r.totalResenas}</td>
                        <td className="py-2.5 pr-4">{r.rating}★</td>
                        <td className="py-2.5 pr-4">{r.nuevasResenas}</td>
                        <td className="py-2.5 pr-4 text-emerald-600">{r.positivas}</td>
                        <td className="py-2.5 pr-4 text-red-600">{r.negativas}</td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span>{r.pendientesRespuesta}</span>
                            <button
                              type="button"
                              onClick={() => openMesModal("edit", r.id)}
                              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                              aria-label="Editar mes"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {tab === "resenas" && (
        <div className="space-y-3">
          {store.resenas.map((r) => (
            <article
              key={r.id}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-2 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Stars rating={r.rating} />
                    <span className="font-medium text-gray-900">{r.autor}</span>
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">
                      {r.plataforma}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">{formatDate(r.fecha)}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => openResenaModal("edit", r.id)}
                    className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    aria-label="Editar"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      confirmDelete(`¿Eliminar reseña de ${r.autor}?`, () => {
                        persist({
                          ...store,
                          resenas: store.resenas.filter((x) => x.id !== r.id),
                        });
                        setModal(null);
                        showToast("Reseña eliminada");
                      })
                    }
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700">{r.texto}</p>
              {r.respondida && r.respuesta && (
                <div className="mt-3 rounded-lg bg-karuma-50 px-3 py-2 text-xs text-karuma-900">
                  <span className="font-medium">Respuesta Karuma: </span>
                  {r.respuesta}
                </div>
              )}
              {!r.respondida && (
                <span className="mt-2 inline-block rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  Respuesta pendiente
                </span>
              )}
            </article>
          ))}
        </div>
      )}

      {tab === "ai" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-500">
            Análisis de impacto de la reputación online en ventas y reservas.
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
        open={modal === "resena"}
        title={editId ? "Editar reseña" : "Nueva reseña"}
        onClose={() => setModal(null)}
      >
        <div className="space-y-3">
          <Field label="Fecha" required>
            <input
              type="date"
              className={inputClass}
              value={resenaForm.fecha}
              onChange={(e) => setResenaForm({ ...resenaForm, fecha: e.target.value })}
            />
          </Field>
          <Field label="Autor" required>
            <input
              className={inputClass}
              value={resenaForm.autor}
              onChange={(e) => setResenaForm({ ...resenaForm, autor: e.target.value })}
              placeholder="Nombre del cliente"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Rating (1-5)" required>
              <select
                className={inputClass}
                value={resenaForm.rating}
                onChange={(e) => setResenaForm({ ...resenaForm, rating: e.target.value })}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} ★
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Plataforma">
              <select
                className={inputClass}
                value={resenaForm.plataforma}
                onChange={(e) =>
                  setResenaForm({
                    ...resenaForm,
                    plataforma: e.target.value as ResenaForm["plataforma"],
                  })
                }
              >
                <option value="Google">Google</option>
                <option value="TripAdvisor">TripAdvisor</option>
                <option value="TheFork">TheFork</option>
              </select>
            </Field>
          </div>
          <Field label="Texto" required>
            <textarea
              className={`${inputClass} min-h-[80px] resize-y`}
              value={resenaForm.texto}
              onChange={(e) => setResenaForm({ ...resenaForm, texto: e.target.value })}
              placeholder="Contenido de la reseña"
            />
          </Field>
          <Field label="Respuesta">
            <textarea
              className={`${inputClass} min-h-[60px] resize-y`}
              value={resenaForm.respuesta}
              onChange={(e) =>
                setResenaForm({
                  ...resenaForm,
                  respuesta: e.target.value,
                  respondida: Boolean(e.target.value.trim()),
                })
              }
              placeholder="Respuesta pública (opcional)"
            />
          </Field>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSaveResena}>
              Guardar
            </Button>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={modal === "mes"}
        title={editId ? "Editar mes" : "Registrar mes"}
        onClose={() => setModal(null)}
      >
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
            <Field label="Total reseñas" required>
              <input
                type="number"
                className={inputClass}
                value={mesForm.totalResenas}
                onChange={(e) => setMesForm({ ...mesForm, totalResenas: e.target.value })}
              />
            </Field>
            <Field label="Rating" required>
              <input
                type="number"
                step="0.01"
                min="1"
                max="5"
                className={inputClass}
                value={mesForm.rating}
                onChange={(e) => setMesForm({ ...mesForm, rating: e.target.value })}
              />
            </Field>
            <Field label="Nuevas">
              <input
                type="number"
                className={inputClass}
                value={mesForm.nuevasResenas}
                onChange={(e) => setMesForm({ ...mesForm, nuevasResenas: e.target.value })}
              />
            </Field>
            <Field label="Positivas">
              <input
                type="number"
                className={inputClass}
                value={mesForm.positivas}
                onChange={(e) => setMesForm({ ...mesForm, positivas: e.target.value })}
              />
            </Field>
            <Field label="Negativas">
              <input
                type="number"
                className={inputClass}
                value={mesForm.negativas}
                onChange={(e) => setMesForm({ ...mesForm, negativas: e.target.value })}
              />
            </Field>
            <Field label="Pendientes">
              <input
                type="number"
                className={inputClass}
                value={mesForm.pendientesRespuesta}
                onChange={(e) =>
                  setMesForm({ ...mesForm, pendientesRespuesta: e.target.value })
                }
              />
            </Field>
          </div>
          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={handleSaveMes}>
              Guardar
            </Button>
            <Button variant="secondary" onClick={() => setModal(null)}>
              Cancelar
            </Button>
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
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-full bg-gray-900 px-4 py-2 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
