"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, AlertCircle, X, CheckCircle, RefreshCw, Wifi } from "lucide-react";
import { ReservasNav } from "@/components/reservas/ReservasNav";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { EstadoReserva } from "@/lib/reservas/types";
import {
  loadReservas,
  loadMesas,
  createReserva,
  sentarReserva,
  liberarMesa,
  updateEstado,
  cambiarMesas,
  getDashboardStats,
  mesaLabel,
  MAX_DIAS,
  type ReservaLocal,
  type EstadoLocal,
  type ServicioLocal,
  type MesaLocal,
} from "@/lib/reservas/local-store";

// ─── Types & constants ────────────────────────────────────────────────────────

// Reserva con fuente marcada para diferenciar acciones
type ReservaConFuente = ReservaLocal & { _sbId?: string };

// Mapea estado de Supabase → EstadoLocal
function mapEstadoSb(e: EstadoReserva): EstadoLocal {
  switch (e) {
    case "Confirmada": return "confirmada";
    case "Sentado":    return "sentada";
    case "Finalizada": return "finished";
    case "Cancelada":  return "cancelada";
    case "NoShow":     return "no-show";
    case "WalkIn":     return "walkin";
    default:           return "confirmada";
  }
}
function mapEstadoToSb(e: EstadoLocal): EstadoReserva {
  switch (e) {
    case "confirmada": return "Confirmada";
    case "pendiente":  return "Confirmada";
    case "sentada":    return "Sentado";
    case "finished":   return "Finalizada";
    case "cancelada":  return "Cancelada";
    case "no-show":    return "NoShow";
    case "walkin":     return "WalkIn";
    default:           return "Confirmada";
  }
}

const ESTADO_STYLE: Record<EstadoLocal, { bg: string; text: string; label: string }> = {
  pendiente:  { bg: "bg-yellow-900/40",  text: "text-yellow-300",  label: "Pendiente"  },
  confirmada: { bg: "bg-emerald-900/40", text: "text-emerald-300", label: "Confirmada" },
  sentada:    { bg: "bg-red-900/40",     text: "text-red-300",     label: "En mesa"    },
  walkin:     { bg: "bg-pink-900/40",    text: "text-pink-300",    label: "Walk-In"    },
  finished:   { bg: "bg-gray-700",       text: "text-gray-400",    label: "Finalizada" },
  "no-show":  { bg: "bg-gray-700",       text: "text-gray-500",    label: "No Show"    },
  cancelada:  { bg: "bg-gray-800",       text: "text-gray-500",    label: "Cancelada"  },
};

function hoy() { return new Date().toISOString().split("T")[0]; }
function maxFecha() {
  const d = new Date(); d.setDate(d.getDate() + MAX_DIAS);
  return d.toISOString().split("T")[0];
}
function autoServicio(): ServicioLocal {
  const h = new Date().getHours();
  return h >= 17 ? "cena" : "comida";
}

// ─── Shared components ────────────────────────────────────────────────────────

function Modal({ open, title, onClose, children }: {
  open: boolean; title: string; onClose: () => void; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center"
         onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-gray-900 p-6 sm:rounded-2xl"
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

// Mesa picker (for seat / change-table modals)
function MesaPicker({ mesas, selected, onToggle }: {
  mesas: MesaLocal[]; selected: string[]; onToggle: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {mesas.map((m) => {
        const sel = selected.includes(m.id);
        return (
          <button key={m.id} onClick={() => onToggle(m.id)}
            className={`rounded-lg border-2 py-1.5 text-center transition-colors ${
              sel ? "border-karuma-500 bg-karuma-900/50 text-karuma-300 font-bold"
                  : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500"
            }`}>
            <p className="text-xs font-bold">T{m.numero}</p>
            <p className="text-[9px] text-gray-500">{m.capacidad}p</p>
          </button>
        );
      })}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReservasPage() {
  const [reservas, setReservas] = useState<ReservaConFuente[]>([]);
  const [mesas, setMesas] = useState<MesaLocal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const sb = getSupabaseClient();

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

  const [toast, setToast] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);

  // ── Nueva Reserva ──────────────────────────────────────────────────────────
  const [showNueva, setShowNueva] = useState(false);
  const [nFecha, setNFecha] = useState(hoy);
  const [nHora, setNHora] = useState("21:00");
  const [nServicio, setNServicio] = useState<ServicioLocal>(autoServicio);
  const [nPersonas, setNPersonas] = useState(2);
  const [nNombre, setNNombre] = useState("");
  const [nTelefono, setNTelefono] = useState("");
  const [nNotas, setNNotas] = useState("");
  const [nMesaIds, setNMesaIds] = useState<string[]>([]);
  const [nError, setNError] = useState("");
  const [nExito, setNExito] = useState<ReservaLocal | null>(null);

  // ── Walk-In ────────────────────────────────────────────────────────────────
  const [showWI, setShowWI] = useState(false);
  const [wPersonas, setWPersonas] = useState(2);
  const [wNombre, setWNombre] = useState("");
  const [wTelefono, setWTelefono] = useState("");
  const [wNotas, setWNotas] = useState("");
  const [wMesaIds, setWMesaIds] = useState<string[]>([]);
  const [wError, setWError] = useState("");
  const [wExito, setWExito] = useState<ReservaLocal | null>(null);

  // ── Sentar modal ───────────────────────────────────────────────────────────
  const [seatR, setSeatR] = useState<ReservaLocal | null>(null);
  const [seatIds, setSeatIds] = useState<string[]>([]);
  const [seatErr, setSeatErr] = useState("");

  // ── Cambiar mesa modal ─────────────────────────────────────────────────────
  const [changeR, setChangeR] = useState<ReservaLocal | null>(null);
  const [changeIds, setChangeIds] = useState<string[]>([]);
  const [changeErr, setChangeErr] = useState("");

  // ── Load: fusiona localStorage + Supabase ─────────────────────────────────
  const reload = useCallback(async () => {
    const locales: ReservaConFuente[] = loadReservas();
    setMesas(loadMesas());

    // Fetch reservas online de Supabase
    let sbReservas: ReservaConFuente[] = [];
    if (sb) {
      const { data } = await sb
        .from("reservas")
        .select("*, clientes_reservas(nombre, telefono)")
        .order("hora_inicio");
      if (data) {
        const localIds = new Set(locales.map((r) => r.id));
        sbReservas = (data as Record<string, unknown>[])
          .filter((r) => !localIds.has(r.id as string)) // no duplicar
          .map((r) => {
            const cliente = (r.clientes_reservas ?? {}) as { nombre?: string; telefono?: string };
            const mesaIds = ((r.mesa_ids as number[]) ?? []).map((n: number) => `T${n}`);
            return {
              id: r.id as string,
              _sbId: r.id as string,
              type: (r.origen === "walkin" ? "walk_in" : "reservation") as ReservaLocal["type"],
              fecha: r.fecha as string,
              hora: r.hora_inicio as string,
              servicio: r.servicio as ServicioLocal,
              personas: r.personas as number,
              mesaIds,
              nombre: cliente.nombre ?? "Sin nombre",
              telefono: cliente.telefono ?? "",
              notas: (r.notas as string) ?? "",
              estado: mapEstadoSb(r.estado as EstadoReserva),
              creadoEn: (r.created_at as string) ?? new Date().toISOString(),
            } satisfies ReservaConFuente;
          });
      }
    }

    setReservas([...locales, ...sbReservas]);
    setLoaded(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

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

  // ── Status actions (soporta local + Supabase) ─────────────────────────────
  async function handleEstado(r: ReservaConFuente, estado: EstadoLocal) {
    if (r._sbId && sb) {
      await sb.from("reservas").update({ estado: mapEstadoToSb(estado) }).eq("id", r._sbId);
    } else {
      updateEstado(r.id, estado);
    }
    setCancelId(null);
    reload();
    showToast("Estado actualizado");
  }

  async function handleLiberar(r: ReservaConFuente) {
    if (r._sbId && sb) {
      await sb.from("reservas").update({ estado: "Finalizada" }).eq("id", r._sbId);
    } else {
      liberarMesa(r.id);
    }
    reload();
    showToast("Mesa liberada");
  }

  // ── Sentar ─────────────────────────────────────────────────────────────────
  function openSeat(r: ReservaConFuente) {
    setSeatR(r); setSeatIds(r.mesaIds.length ? r.mesaIds : []); setSeatErr("");
  }
  async function submitSeat() {
    if (!seatR) return;
    const r = seatR as ReservaConFuente;
    if (r._sbId && sb) {
      await sb.from("reservas").update({ estado: "Sentado" }).eq("id", r._sbId);
      setSeatR(null); reload(); showToast("Cliente sentado");
    } else {
      const res = sentarReserva(r.id, seatIds.length ? seatIds : undefined);
      if (!res.ok) { setSeatErr(res.error); return; }
      setSeatR(null); reload(); showToast("Cliente sentado");
    }
  }

  // ── Cambiar mesa ───────────────────────────────────────────────────────────
  function openChange(r: ReservaLocal) {
    setChangeR(r); setChangeIds(r.mesaIds); setChangeErr("");
  }
  function submitChange() {
    if (!changeR) return;
    if (!changeIds.length) { setChangeErr("Selecciona al menos una mesa."); return; }
    const res = cambiarMesas(changeR.id, changeIds);
    if (!res.ok) { setChangeErr(res.error); return; }
    setChangeR(null); reload(); showToast("Mesa actualizada");
  }

  // ── Nueva Reserva ──────────────────────────────────────────────────────────
  function submitNueva() {
    setNError("");
    if (!nTelefono.trim()) { setNError("El teléfono es obligatorio."); return; }
    if (!nFecha || !nHora)  { setNError("Fecha y hora son obligatorias."); return; }
    if (nPersonas < 1)      { setNError("Indica el número de personas."); return; }
    const res = createReserva({
      fecha: nFecha, hora: nHora, servicio: nServicio, personas: nPersonas,
      nombre: nNombre, telefono: nTelefono, notas: nNotas, origen: "manual",
      forceMesaIds: nMesaIds.length ? nMesaIds : undefined,
    });
    if (!res.ok) { setNError(res.error); return; }
    setNExito(res.reserva); reload();
  }
  function cerrarNueva() {
    setShowNueva(false); setNError(""); setNExito(null);
    setNNombre(""); setNTelefono(""); setNNotas(""); setNMesaIds([]);
    setNFecha(hoy()); setNHora("21:00"); setNServicio(autoServicio()); setNPersonas(2);
  }

  // ── Walk-In ────────────────────────────────────────────────────────────────
  function submitWI() {
    setWError("");
    if (wPersonas < 1) { setWError("Indica el número de personas."); return; }
    const res = createReserva({
      fecha: hoy(), hora: new Date().toTimeString().slice(0, 5),
      servicio: autoServicio(), personas: wPersonas,
      nombre: wNombre, telefono: wTelefono, notas: wNotas, origen: "walkin",
      forceMesaIds: wMesaIds.length ? wMesaIds : undefined,
    });
    if (!res.ok) { setWError(res.error); return; }
    setWExito(res.reserva); reload();
  }
  function cerrarWI() {
    setShowWI(false); setWError(""); setWExito(null);
    setWNombre(""); setWTelefono(""); setWNotas(""); setWPersonas(2); setWMesaIds([]);
  }

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <div className="-m-3 min-h-dvh bg-gray-950 p-4 text-gray-100 sm:-m-4 md:-m-6 md:p-6">
      <div className="mx-auto max-w-5xl">
        <ReservasNav />

        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-black text-white">Reservas</h1>
          <div className="flex gap-2">
            <button onClick={() => setShowWI(true)}
              className="rounded-xl bg-pink-700 px-4 py-2 text-sm font-bold text-white hover:bg-pink-600">
              Walk-In
            </button>
            <button onClick={() => setShowNueva(true)}
              className="flex items-center gap-1.5 rounded-xl bg-karuma-600 px-4 py-2 text-sm font-bold text-white hover:bg-karuma-700">
              <Plus className="h-4 w-4" /> Nueva
            </button>
          </div>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="mb-4 grid grid-cols-4 gap-2">
            {[
              { label: "Reservas", value: stats.reservasHoy,  color: "text-white"        },
              { label: "Pax",      value: stats.paxHoy,       color: "text-emerald-400"  },
              { label: "En mesa",  value: stats.sentadasHoy,  color: "text-red-400"      },
              { label: "No Show",  value: stats.noShowsHoy,   color: "text-yellow-400"   },
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
            <input placeholder="Buscar…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              className="w-24 bg-transparent text-sm focus:outline-none" />
          </div>
          <button onClick={reload} className="rounded-lg border border-gray-700 bg-gray-800 p-2 text-gray-400 hover:bg-gray-700">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Status chips */}
        <div className="mb-4 flex flex-wrap gap-2">
          {([
            { val: "" as const,   label: "Todas"      },
            { val: "confirmada",  label: "Confirmadas" },
            { val: "pendiente",   label: "Pendientes"  },
            { val: "sentada",     label: "En mesa"     },
            { val: "walkin",      label: "Walk-In"     },
            { val: "finished",    label: "Finalizadas" },
            { val: "no-show",     label: "No Show"     },
            { val: "cancelada",   label: "Canceladas"  },
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
            <p className="text-gray-500">No hay reservas.</p>
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
              const isActive = r.estado !== "finished" && r.estado !== "cancelada" && r.estado !== "no-show";
              return (
                <div key={r.id} className="rounded-xl border border-gray-800 bg-gray-900 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold">{r.hora}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.bg} ${st.text}`}>
                          {st.label}
                        </span>
                        <span className="text-xs text-gray-500 capitalize">{r.servicio}</span>
                        {r.type === "walk_in" && (
                          <span className="rounded-full bg-pink-900/30 px-2 py-0.5 text-[10px] font-bold text-pink-400">WALK-IN</span>
                        )}
                        {r._sbId && (
                          <span className="flex items-center gap-1 rounded-full bg-blue-900/40 px-2 py-0.5 text-[10px] font-bold text-blue-400">
                            <Wifi className="h-2.5 w-2.5" /> Online
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 font-semibold text-gray-200">{r.nombre}</p>
                      <p className="text-sm text-gray-400">
                        {r.telefono && <span className="mr-3">{r.telefono}</span>}
                        <span>{r.personas} pax</span>
                        {mesa !== "—" && <span className="ml-3 font-semibold text-karuma-400">{mesa}</span>}
                      </p>
                      {r.notas && <p className="mt-1 text-xs italic text-gray-500">{r.notas}</p>}
                      {r.seatedAt && (
                        <p className="mt-0.5 text-[10px] text-gray-600">
                          Entrada: {new Date(r.seatedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                          {r.finishedAt && ` · Salida: ${new Date(r.finishedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`}
                        </p>
                      )}
                    </div>

                    {/* Action buttons */}
                    {isActive && (
                      <div className="flex flex-wrap gap-1.5">
                        {/* Confirm */}
                        {r.estado === "pendiente" && (
                          <button onClick={() => handleEstado(r, "confirmada")}
                            className="rounded-lg bg-emerald-800 px-2.5 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-700">
                            Confirmar
                          </button>
                        )}
                        {/* Seat */}
                        {(r.estado === "confirmada" || r.estado === "pendiente") && (
                          <button onClick={() => openSeat(r)}
                            className="rounded-lg bg-red-800 px-2.5 py-1 text-xs font-semibold text-red-200 hover:bg-red-700">
                            Sentar
                          </button>
                        )}
                        {/* Liberar */}
                        {(r.estado === "sentada" || r.estado === "walkin") && (
                          <button onClick={() => handleLiberar(r)}
                            className="rounded-lg bg-gray-700 px-2.5 py-1 text-xs font-semibold text-gray-300 hover:bg-gray-600">
                            Liberar
                          </button>
                        )}
                        {/* Change mesa */}
                        {!r._sbId && (
                          <button onClick={() => openChange(r)}
                            className="rounded-lg bg-gray-800 px-2.5 py-1 text-xs text-gray-400 hover:bg-gray-700">
                            Mesa
                          </button>
                        )}
                        {/* No show */}
                        {r.estado !== "no-show" && (
                          <button onClick={() => handleEstado(r, "no-show")}
                            className="rounded-lg bg-yellow-900 px-2.5 py-1 text-xs font-semibold text-yellow-300 hover:bg-yellow-800">
                            No Show
                          </button>
                        )}
                        {/* Cancel */}
                        {cancelId === r.id ? (
                          <>
                            <button onClick={() => handleEstado(r, "cancelada")}
                              className="rounded-lg bg-red-700 px-2.5 py-1 text-xs font-bold text-white">¿Seguro?</button>
                            <button onClick={() => setCancelId(null)}
                              className="rounded-lg bg-gray-700 px-2.5 py-1 text-xs text-gray-300">No</button>
                          </>
                        ) : (
                          <button onClick={() => setCancelId(r.id)}
                            className="rounded-lg bg-gray-800 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-700">
                            Cancelar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-gray-800 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* ── Nueva Reserva ─────────────────────────────────────────────────────── */}
      <Modal open={showNueva} title="Nueva Reserva" onClose={cerrarNueva}>
        {nExito ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-emerald-900/40 p-4">
              <CheckCircle className="h-6 w-6 shrink-0 text-emerald-400" />
              <div>
                <p className="font-bold text-emerald-300">Reserva confirmada</p>
                <p className="text-sm text-emerald-400">{mesaLabel(nExito.mesaIds)} asignada</p>
              </div>
            </div>
            <div className="rounded-xl bg-gray-800 p-4 text-sm space-y-1.5">
              <div className="flex justify-between"><span className="text-gray-400">Nombre</span><span className="font-semibold">{nExito.nombre}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Fecha</span><span className="font-semibold">{nExito.fecha} · {nExito.hora}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Personas</span><span className="font-semibold">{nExito.personas}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Mesa</span><span className="font-bold text-karuma-400">{mesaLabel(nExito.mesaIds)}</span></div>
            </div>
            <button onClick={cerrarNueva} className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white hover:bg-karuma-700">Cerrar</button>
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
                <input type="time" value={nHora} onChange={(e) => setNHora(e.target.value)} className={inp} />
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
              <textarea rows={2} value={nNotas} onChange={(e) => setNNotas(e.target.value)} className={inp}
                placeholder="Alergias, celebraciones…" />
            </Field>
            <Field label="Mesa manual (opcional — si no eliges, asignación auto)">
              <MesaPicker mesas={mesas} selected={nMesaIds}
                onToggle={(id) => setNMesaIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])} />
            </Field>
            <button onClick={submitNueva}
              className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white hover:bg-karuma-700">
              Confirmar reserva
            </button>
          </div>
        )}
      </Modal>

      {/* ── Walk-In ───────────────────────────────────────────────────────────── */}
      <Modal open={showWI} title="Walk-In" onClose={cerrarWI}>
        {wExito ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl bg-pink-900/40 p-4">
              <CheckCircle className="h-6 w-6 shrink-0 text-pink-400" />
              <div>
                <p className="font-bold text-pink-300">Walk-In registrado</p>
                <p className="text-sm text-pink-400">Mesa: {mesaLabel(wExito.mesaIds)}</p>
              </div>
            </div>
            <div className="rounded-xl bg-gray-800 p-4 text-center">
              <p className="text-4xl font-black text-pink-400">{mesaLabel(wExito.mesaIds)}</p>
              <p className="text-sm text-gray-400">{wExito.personas} personas</p>
            </div>
            <button onClick={cerrarWI} className="w-full rounded-xl bg-pink-700 py-3 font-bold text-white hover:bg-pink-600">Cerrar</button>
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
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-700 text-xl font-bold hover:bg-gray-600">−</button>
                <span className="flex-1 text-center text-4xl font-black">{wPersonas}</span>
                <button onClick={() => setWPersonas(Math.min(20, wPersonas + 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-700 text-xl font-bold hover:bg-gray-600">+</button>
              </div>
            </Field>
            <Field label="Nombre (opcional)">
              <input value={wNombre} onChange={(e) => setWNombre(e.target.value)} className={inp} placeholder="Walk-In" />
            </Field>
            <Field label="Teléfono (opcional)">
              <input type="tel" value={wTelefono} onChange={(e) => setWTelefono(e.target.value)} className={inp} placeholder="+34…" />
            </Field>
            <Field label="Notas">
              <textarea rows={2} value={wNotas} onChange={(e) => setWNotas(e.target.value)} className={inp} />
            </Field>
            <Field label="Mesa (opcional — si no eliges, asignación auto)">
              <MesaPicker mesas={mesas} selected={wMesaIds}
                onToggle={(id) => setWMesaIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])} />
            </Field>
            <button onClick={submitWI}
              className="w-full rounded-xl bg-pink-700 py-3.5 text-base font-black text-white hover:bg-pink-600">
              Asignar mesa ahora
            </button>
          </div>
        )}
      </Modal>

      {/* ── Sentar modal ──────────────────────────────────────────────────────── */}
      <Modal open={!!seatR} title="Sentar cliente" onClose={() => setSeatR(null)}>
        {seatR && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">{seatR.nombre} · {seatR.personas} personas · {seatR.hora}</p>
            {seatErr && <p className="rounded-xl bg-red-900/40 px-3 py-2 text-sm text-red-300">{seatErr}</p>}
            <div>
              <p className="mb-2 text-xs text-gray-400">Selecciona mesa(s) o deja vacío para auto-asignar:</p>
              <MesaPicker mesas={mesas} selected={seatIds}
                onToggle={(id) => setSeatIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])} />
            </div>
            <button onClick={submitSeat}
              className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white hover:bg-karuma-700">
              {seatIds.length ? `Sentar en ${seatIds.join(", ")}` : "Sentar (auto)"}
            </button>
          </div>
        )}
      </Modal>

      {/* ── Cambiar mesa modal ────────────────────────────────────────────────── */}
      <Modal open={!!changeR} title="Cambiar mesa" onClose={() => setChangeR(null)}>
        {changeR && (
          <div className="space-y-4">
            <p className="text-sm text-gray-300">{changeR.nombre} · Mesa actual: {mesaLabel(changeR.mesaIds)}</p>
            {changeErr && <p className="rounded-xl bg-red-900/40 px-3 py-2 text-sm text-red-300">{changeErr}</p>}
            <div>
              <p className="mb-2 text-xs text-gray-400">Selecciona la nueva mesa (puedes elegir varias):</p>
              <MesaPicker mesas={mesas} selected={changeIds}
                onToggle={(id) => setChangeIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])} />
            </div>
            <button onClick={submitChange}
              className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white hover:bg-karuma-700">
              Guardar cambio
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
