"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, AlertCircle, X, CheckCircle, RefreshCw } from "lucide-react";
import { ReservasNav } from "@/components/reservas/ReservasNav";
import {
  loadReservas,
  loadMesas,
  createReserva,
  updateEstado,
  deleteReserva,
  getDashboardStats,
  mesaLabel,
  MAX_DIAS,
  type ReservaLocal,
  type EstadoLocal,
  type ServicioLocal,
  type MesaLocal,
} from "@/lib/reservas/local-store";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ESTADO_STYLE: Record<EstadoLocal, { bg: string; text: string; label: string }> = {
  pendiente:  { bg: "bg-yellow-900/40",  text: "text-yellow-300",  label: "Pendiente"  },
  confirmada: { bg: "bg-emerald-900/40", text: "text-emerald-300", label: "Confirmada" },
  sentada:    { bg: "bg-red-900/40",     text: "text-red-300",     label: "En mesa"    },
  walkin:     { bg: "bg-pink-900/40",    text: "text-pink-300",    label: "Walk-In"    },
  "no-show":  { bg: "bg-gray-700",       text: "text-gray-400",    label: "No Show"    },
  cancelada:  { bg: "bg-gray-800",       text: "text-gray-500",    label: "Cancelada"  },
};

function hoy(): string { return new Date().toISOString().split("T")[0]; }
function maxFecha(): string {
  const d = new Date();
  d.setDate(d.getDate() + MAX_DIAS);
  return d.toISOString().split("T")[0];
}
function horaActual(): string { return new Date().toTimeString().slice(0, 5); }
function autoServicio(): ServicioLocal {
  const h = new Date().getHours();
  return h >= 17 ? "cena" : "comida";
}

// ─── Small reusable modal shell ───────────────────────────────────────────────

function Modal({ open, title, onClose, children }: {
  open: boolean; title: string; onClose: () => void; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
         onClick={onClose}>
      <div className="w-full max-w-md rounded-t-2xl bg-gray-900 p-6 sm:rounded-2xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400">
        {label}{required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inp = "w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 focus:border-karuma-500 focus:outline-none";

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReservasPage() {
  const [reservas, setReservas] = useState<ReservaLocal[]>([]);
  const [mesas, setMesas] = useState<MesaLocal[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Filters
  const [fecha, setFecha] = useState(hoy);
  const [servicio, setServicio] = useState<"" | ServicioLocal>(() => {
    const h = new Date().getHours();
    if (h >= 12 && h < 17) return "comida";
    if (h >= 19) return "cena";
    return "";
  });
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoLocal | "">("");
  const [busqueda, setBusqueda] = useState("");

  // Success toast
  const [toast, setToast] = useState("");

  // Cancel confirm
  const [cancelId, setCancelId] = useState<string | null>(null);

  // ── Nueva Reserva modal ──────────────────────────────────────────────────────
  const [showNueva, setShowNueva] = useState(false);
  const [nFecha, setNFecha] = useState(hoy);
  const [nHora, setNHora] = useState("21:00");
  const [nServicio, setNServicio] = useState<ServicioLocal>(autoServicio);
  const [nPersonas, setNPersonas] = useState(2);
  const [nNombre, setNNombre] = useState("");
  const [nTelefono, setNTelefono] = useState("");
  const [nNotas, setNNotas] = useState("");
  const [nError, setNError] = useState("");
  const [nEnviando, setNEnviando] = useState(false);
  const [nExito, setNExito] = useState<ReservaLocal | null>(null);

  // ── Walk-In modal ────────────────────────────────────────────────────────────
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [wPersonas, setWPersonas] = useState(2);
  const [wNombre, setWNombre] = useState("");
  const [wTelefono, setWTelefono] = useState("");
  const [wNotas, setWNotas] = useState("");
  const [wError, setWError] = useState("");
  const [wEnviando, setWEnviando] = useState(false);
  const [wExito, setWExito] = useState<ReservaLocal | null>(null);

  // ── Load ─────────────────────────────────────────────────────────────────────
  const reload = useCallback(() => {
    setReservas(loadReservas());
    setMesas(loadMesas());
    setLoaded(true);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  // ── Derived lists ─────────────────────────────────────────────────────────────
  const stats = loaded ? getDashboardStats(fecha) : null;

  const filtradas = reservas.filter((r) => {
    if (r.fecha !== fecha) return false;
    if (servicio && r.servicio !== servicio) return false;
    if (estadoFiltro && r.estado !== estadoFiltro) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!r.nombre.toLowerCase().includes(q) && !r.telefono.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => a.hora.localeCompare(b.hora));

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // ── Status change ─────────────────────────────────────────────────────────────
  function cambiarEstado(id: string, estado: EstadoLocal) {
    updateEstado(id, estado);
    setCancelId(null);
    reload();
    showToast("Estado actualizado");
  }

  // ── Nueva Reserva submit ──────────────────────────────────────────────────────
  function submitNueva() {
    setNError("");
    if (!nTelefono.trim()) { setNError("El teléfono es obligatorio."); return; }
    if (!nFecha || !nHora) { setNError("Fecha y hora son obligatorias."); return; }
    if (nPersonas < 1) { setNError("Indica el número de personas."); return; }
    setNEnviando(true);
    const result = createReserva({
      fecha: nFecha, hora: nHora, servicio: nServicio,
      personas: nPersonas, nombre: nNombre, telefono: nTelefono,
      notas: nNotas, origen: "manual",
    });
    setNEnviando(false);
    if (!result.ok) { setNError(result.error); return; }
    setNExito(result.reserva);
    reload();
  }

  function cerrarNueva() {
    setShowNueva(false);
    setNError(""); setNExito(null);
    setNNombre(""); setNTelefono(""); setNNotas("");
    setNFecha(hoy()); setNHora("21:00"); setNServicio(autoServicio()); setNPersonas(2);
  }

  // ── Walk-In submit ────────────────────────────────────────────────────────────
  function submitWalkIn() {
    setWError("");
    if (wPersonas < 1) { setWError("Indica el número de personas."); return; }
    setWEnviando(true);
    const result = createReserva({
      fecha: hoy(), hora: horaActual(), servicio: autoServicio(),
      personas: wPersonas, nombre: wNombre, telefono: wTelefono,
      notas: wNotas, origen: "walkin",
    });
    setWEnviando(false);
    if (!result.ok) { setWError(result.error); return; }
    setWExito(result.reserva);
    reload();
  }

  function cerrarWalkIn() {
    setShowWalkIn(false);
    setWError(""); setWExito(null);
    setWNombre(""); setWTelefono(""); setWNotas(""); setWPersonas(2);
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="-m-3 min-h-dvh bg-gray-950 p-4 text-gray-100 sm:-m-4 md:-m-6 md:p-6">
      <div className="mx-auto max-w-5xl">
        <ReservasNav />

        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-black text-white">Gestión de Reservas</h1>
          <div className="flex gap-2">
            <button
              onClick={() => setShowWalkIn(true)}
              className="rounded-xl bg-pink-700 px-4 py-2 text-sm font-bold text-white hover:bg-pink-600"
            >
              Walk-In
            </button>
            <button
              onClick={() => setShowNueva(true)}
              className="flex items-center gap-1.5 rounded-xl bg-karuma-600 px-4 py-2 text-sm font-bold text-white hover:bg-karuma-700"
            >
              <Plus className="h-4 w-4" /> Nueva Reserva
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="mb-4 grid grid-cols-4 gap-2">
            {[
              { label: "Reservas", value: stats.reservasHoy, color: "text-white" },
              { label: "Pax hoy",  value: stats.paxHoy,       color: "text-emerald-400" },
              { label: "En mesa",  value: stats.sentadasHoy,  color: "text-red-400" },
              { label: "No Show",  value: stats.noShowsHoy,   color: "text-yellow-400" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-gray-800 bg-gray-900 px-3 py-2.5 text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="mt-0.5 text-[10px] text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="mb-3 flex flex-wrap gap-2">
          <input type="date" value={fecha} min={hoy()} max={maxFecha()}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white" />
          <select value={servicio} onChange={(e) => setServicio(e.target.value as "" | ServicioLocal)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white">
            <option value="">Todos</option>
            <option value="comida">🍱 Comida</option>
            <option value="cena">🍣 Cena</option>
          </select>
          <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input placeholder="Buscar…" value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-28 bg-transparent text-sm focus:outline-none" />
          </div>
          <button onClick={reload} className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-400 hover:bg-gray-700">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Status filter chips */}
        <div className="mb-4 flex flex-wrap gap-2">
          {([
            { val: "" as const,        label: "Todas"      },
            { val: "confirmada",       label: "Confirmadas" },
            { val: "pendiente",        label: "Pendientes"  },
            { val: "sentada",          label: "En mesa"     },
            { val: "walkin",           label: "Walk-In"     },
            { val: "no-show",          label: "No Show"     },
            { val: "cancelada",        label: "Canceladas"  },
          ] as { val: EstadoLocal | ""; label: string }[]).map(({ val, label }) => {
            const count = val ? reservas.filter((r) => r.fecha === fecha && r.estado === val).length : null;
            return (
              <button key={val} onClick={() => setEstadoFiltro(val)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  estadoFiltro === val ? "bg-karuma-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}>
                {label}{count !== null && <span className="ml-1 opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>

        {/* List */}
        {!loaded ? (
          <p className="py-12 text-center text-gray-500">Cargando…</p>
        ) : filtradas.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-500">No hay reservas para este filtro.</p>
            <button onClick={() => setShowNueva(true)}
              className="mt-4 rounded-xl bg-karuma-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-karuma-700">
              + Nueva Reserva
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {filtradas.map((r) => {
              const st = ESTADO_STYLE[r.estado];
              const mesa = mesaLabel(r.mesaIds);
              return (
                <div key={r.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-white">{r.hora}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.bg} ${st.text}`}>
                          {st.label}
                        </span>
                        <span className="text-xs text-gray-500">{r.servicio}</span>
                      </div>
                      <p className="mt-0.5 font-semibold text-gray-200">{r.nombre}</p>
                      <p className="text-sm text-gray-400">
                        {r.telefono && <span className="mr-3">{r.telefono}</span>}
                        <span>{r.personas} personas</span>
                        <span className="ml-3 text-karuma-400">{mesa}</span>
                      </p>
                      {r.notas && <p className="mt-1 text-xs italic text-gray-500">{r.notas}</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-1.5">
                      {r.estado === "pendiente" && (
                        <button onClick={() => cambiarEstado(r.id, "confirmada")}
                          className="rounded-lg bg-emerald-800 px-2.5 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-700">
                          Confirmar
                        </button>
                      )}
                      {(r.estado === "confirmada" || r.estado === "pendiente") && (
                        <button onClick={() => cambiarEstado(r.id, "sentada")}
                          className="rounded-lg bg-red-800 px-2.5 py-1 text-xs font-semibold text-red-200 hover:bg-red-700">
                          Sentar
                        </button>
                      )}
                      {r.estado === "sentada" && (
                        <button onClick={() => cambiarEstado(r.id, "confirmada")}
                          className="rounded-lg bg-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-300 hover:bg-gray-600">
                          Finalizar
                        </button>
                      )}
                      {r.estado !== "no-show" && r.estado !== "cancelada" && (
                        <button onClick={() => cambiarEstado(r.id, "no-show")}
                          className="rounded-lg bg-yellow-900 px-2.5 py-1 text-xs font-semibold text-yellow-300 hover:bg-yellow-800">
                          No Show
                        </button>
                      )}
                      {cancelId === r.id ? (
                        <>
                          <button onClick={() => cambiarEstado(r.id, "cancelada")}
                            className="rounded-lg bg-red-700 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-600">
                            ¿Seguro?
                          </button>
                          <button onClick={() => setCancelId(null)}
                            className="rounded-lg bg-gray-700 px-2.5 py-1 text-xs text-gray-300">
                            No
                          </button>
                        </>
                      ) : r.estado !== "cancelada" ? (
                        <button onClick={() => setCancelId(r.id)}
                          className="rounded-lg bg-gray-800 px-2.5 py-1 text-xs text-gray-400 hover:bg-gray-700">
                          Cancelar
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Toast ─────────────────────────────────────────────────────────────── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-gray-800 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* ── Nueva Reserva modal ────────────────────────────────────────────────── */}
      <Modal open={showNueva} title="Nueva Reserva" onClose={cerrarNueva}>
        {nExito ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-emerald-900/40 p-4">
              <CheckCircle className="h-6 w-6 shrink-0 text-emerald-400" />
              <div>
                <p className="font-bold text-emerald-300">Reserva creada</p>
                <p className="text-sm text-emerald-400">{mesaLabel(nExito.mesaIds)} asignada</p>
              </div>
            </div>
            <div className="rounded-xl bg-gray-800 p-4 text-sm space-y-1">
              <p><span className="text-gray-400">Nombre:</span> <span className="font-semibold text-white">{nExito.nombre}</span></p>
              <p><span className="text-gray-400">Fecha:</span> <span className="font-semibold text-white">{nExito.fecha} · {nExito.hora}</span></p>
              <p><span className="text-gray-400">Personas:</span> <span className="font-semibold text-white">{nExito.personas}</span></p>
              <p><span className="text-gray-400">Mesa:</span> <span className="font-bold text-karuma-400">{mesaLabel(nExito.mesaIds)}</span></p>
              <p><span className="text-gray-400">Servicio:</span> <span className="font-semibold text-white capitalize">{nExito.servicio}</span></p>
            </div>
            <button onClick={cerrarNueva}
              className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white hover:bg-karuma-700">
              Cerrar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {nError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-900/40 p-3 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" /> {nError}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fecha" required>
                <input type="date" value={nFecha} min={hoy()} max={maxFecha()}
                  onChange={(e) => setNFecha(e.target.value)} className={inp} />
              </Field>
              <Field label="Hora" required>
                <input type="time" value={nHora}
                  onChange={(e) => setNHora(e.target.value)} className={inp} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Servicio" required>
                <select value={nServicio} onChange={(e) => setNServicio(e.target.value as ServicioLocal)} className={inp}>
                  <option value="comida">🍱 Comida</option>
                  <option value="cena">🍣 Cena</option>
                </select>
              </Field>
              <Field label="Personas" required>
                <input type="number" min={1} max={20} value={nPersonas}
                  onChange={(e) => setNPersonas(Number(e.target.value))} className={inp} />
              </Field>
            </div>
            <Field label="Nombre del cliente">
              <input placeholder="Ej. Ana García" value={nNombre}
                onChange={(e) => setNNombre(e.target.value)} className={inp} />
            </Field>
            <Field label="Teléfono" required>
              <input type="tel" placeholder="+34 6XX XXX XXX" value={nTelefono}
                onChange={(e) => setNTelefono(e.target.value)} className={inp} />
            </Field>
            <Field label="Notas">
              <textarea rows={2} placeholder="Alergias, ocasiones especiales…" value={nNotas}
                onChange={(e) => setNNotas(e.target.value)} className={inp} />
            </Field>
            <button onClick={submitNueva} disabled={nEnviando}
              className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white hover:bg-karuma-700 disabled:opacity-50">
              {nEnviando ? "Reservando…" : "Confirmar reserva"}
            </button>
          </div>
        )}
      </Modal>

      {/* ── Walk-In modal ──────────────────────────────────────────────────────── */}
      <Modal open={showWalkIn} title="Walk-In — Cliente en puerta" onClose={cerrarWalkIn}>
        {wExito ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-pink-900/40 p-4">
              <CheckCircle className="h-6 w-6 shrink-0 text-pink-400" />
              <div>
                <p className="font-bold text-pink-300">Walk-In registrado</p>
                <p className="text-sm text-pink-400">{mesaLabel(wExito.mesaIds)} asignada</p>
              </div>
            </div>
            <div className="rounded-xl bg-gray-800 p-4 text-sm space-y-1">
              <p><span className="text-gray-400">Mesa asignada:</span> <span className="text-xl font-black text-pink-400">{mesaLabel(wExito.mesaIds)}</span></p>
              <p><span className="text-gray-400">Personas:</span> <span className="font-semibold text-white">{wExito.personas}</span></p>
              {wExito.nombre !== "Sin nombre" && (
                <p><span className="text-gray-400">Nombre:</span> <span className="font-semibold text-white">{wExito.nombre}</span></p>
              )}
            </div>
            <button onClick={cerrarWalkIn}
              className="w-full rounded-xl bg-pink-700 py-3 font-bold text-white hover:bg-pink-600">
              Cerrar
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {wError && (
              <div className="flex items-center gap-2 rounded-xl bg-red-900/40 p-3 text-sm text-red-300">
                <AlertCircle className="h-4 w-4 shrink-0" /> {wError}
              </div>
            )}
            <Field label="Personas" required>
              <div className="flex items-center gap-3">
                <button onClick={() => setWPersonas(Math.max(1, wPersonas - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-700 text-xl font-bold text-white hover:bg-gray-600">
                  −
                </button>
                <span className="flex-1 text-center text-3xl font-black text-white">{wPersonas}</span>
                <button onClick={() => setWPersonas(Math.min(20, wPersonas + 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-700 text-xl font-bold text-white hover:bg-gray-600">
                  +
                </button>
              </div>
            </Field>
            <Field label="Nombre (opcional)">
              <input placeholder="Sin nombre" value={wNombre}
                onChange={(e) => setWNombre(e.target.value)} className={inp} />
            </Field>
            <Field label="Teléfono (opcional)">
              <input type="tel" placeholder="+34 6XX XXX XXX" value={wTelefono}
                onChange={(e) => setWTelefono(e.target.value)} className={inp} />
            </Field>
            <Field label="Notas">
              <textarea rows={2} placeholder="Observaciones…" value={wNotas}
                onChange={(e) => setWNotas(e.target.value)} className={inp} />
            </Field>
            <button onClick={submitWalkIn} disabled={wEnviando}
              className="w-full rounded-xl bg-pink-700 py-3 font-bold text-white hover:bg-pink-600 disabled:opacity-50">
              {wEnviando ? "Asignando…" : "Asignar mesa ahora"}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
