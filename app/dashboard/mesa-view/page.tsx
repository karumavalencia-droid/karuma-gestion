"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Users, Clock, Plus } from "lucide-react";
import { ReservasNav } from "@/components/reservas/ReservasNav";
import { syncAndLoadReservas } from "@/lib/reservas/sync";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  getMesasConEstado,
  createWalkInForMesa,
  createReserva,
  sentarReserva,
  liberarMesa,
  updateEstado,
  editReserva,
  slotsPlano,
  defaultHoraPlano,
  MESAS_SEED,
  type MesaConEstado,
  type MesaLocal,
  type ReservaLocal,
  type ServicioLocal,
} from "@/lib/reservas/local-store";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  available: { bg: "bg-white",        border: "border-gray-200",    badge: "bg-gray-100 text-gray-500",       label: "Libre"     },
  reserved:  { bg: "bg-emerald-50",   border: "border-emerald-400", badge: "bg-emerald-100 text-emerald-700", label: "Reservada" },
  occupied:  { bg: "bg-red-50",       border: "border-red-400",     badge: "bg-red-100 text-red-700",         label: "Ocupada"   },
  cleaning:  { bg: "bg-yellow-50",    border: "border-yellow-400",  badge: "bg-yellow-100 text-yellow-700",   label: "Limpieza"  },
};

const ESTADO_CORTO: Record<string, string> = {
  pendiente: "Pendiente", confirmada: "Confirmada", llegada: "Llegada",
  sentada: "En mesa", walkin: "Walk-In", finished: "Finalizada",
  "no-show": "No Show", cancelada: "Cancelada",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hoy() { return new Date().toISOString().split("T")[0]; }
function autoServicio(): ServicioLocal { return new Date().getHours() >= 15 ? "cena" : "comida"; }
const FECHA_KEY = "karuma_shared_fecha";
function getSharedFecha() {
  if (typeof window === "undefined") return hoy();
  return localStorage.getItem(FECHA_KEY) || hoy();
}
function setSharedFecha(f: string) {
  if (typeof window !== "undefined") localStorage.setItem(FECHA_KEY, f);
}
function duracion(seatedAt?: string) {
  if (!seatedAt) return "";
  const mins = Math.floor((Date.now() - new Date(seatedAt).getTime()) / 60_000);
  return mins < 60 ? `${mins} min` : `${Math.floor(mins / 60)}h ${mins % 60}m`;
}
function nowHHMM() { return new Date().toTimeString().slice(0, 5); }

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
           onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ─── Mesa picker ──────────────────────────────────────────────────────────────

function MesaPicker({ mesas, selectedIds, onToggle }: { mesas: MesaLocal[]; selectedIds: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {mesas.map((m) => {
        const sel = selectedIds.includes(m.id);
        return (
          <button key={m.id} onClick={() => onToggle(m.id)}
            className={`rounded-lg border-2 px-2 py-1.5 text-center transition-colors ${
              sel ? "border-karuma-600 bg-karuma-50 text-karuma-700 font-bold"
                  : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400"
            }`}>
            <p className="text-xs font-bold">T{m.numero}</p>
            <p className="text-[10px] text-gray-500">{m.capacidad}p</p>
          </button>
        );
      })}
    </div>
  );
}

const inp = "w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-karuma-500 focus:outline-none";

// ─── Main component ───────────────────────────────────────────────────────────

export default function MesaViewPage() {
  const [fecha, setFecha]       = useState(getSharedFecha);
  const [servicio, setServicio] = useState<ServicioLocal>(autoServicio);
  const [horaPlano, setHoraPlano] = useState(() => defaultHoraPlano(getSharedFecha(), autoServicio()));
  const [mesas, setMesas]       = useState<MesaConEstado[]>([]);
  const [tick, setTick]         = useState(0);
  const [toast, setToast]       = useState("");

  // Selected mesa detail modal
  const [sel, setSel] = useState<MesaConEstado | null>(null);

  // Walk-In modal
  const [wiMesa, setWiMesa]         = useState<MesaConEstado | null>(null);
  const [wiPersonas, setWiPersonas] = useState(2);
  const [wiNombre, setWiNombre]     = useState("");
  const [wiTelefono, setWiTelefono] = useState("");
  const [wiNotas, setWiNotas]       = useState("");
  const [wiError, setWiError]       = useState("");
  const [wiOk, setWiOk]             = useState(false);
  const [wiGeneral, setWiGeneral]   = useState(false); // true = opened from top bar, needs mesa picker
  const [wiSelectedId, setWiSelectedId] = useState<string>(""); // mesa selected in general mode

  // Nueva Reserva modal
  const [showNueva, setShowNueva]     = useState(false);
  const [nNombre, setNNombre]         = useState("");
  const [nTelefono, setNTelefono]     = useState("");
  const [nPersonas, setNPersonas]     = useState(2);
  const [nHora, setNHora]             = useState(nowHHMM);
  const [nServicio, setNServicio]     = useState<ServicioLocal>(autoServicio);
  const [nMesaIds, setNMesaIds]       = useState<string[]>([]);
  const [nNotas, setNNotas]           = useState("");
  const [nError, setNError]           = useState("");

  // Seat modal
  const [seatReserva, setSeatReserva] = useState<ReservaLocal | null>(null);
  const [seatMesaIds, setSeatMesaIds] = useState<string[]>([]);
  const [seatError, setSeatError]     = useState("");

  // Cancel confirm
  const [cancelReservaId, setCancelReservaId] = useState<string | null>(null);

  // Edit (personas + hora) inline en el modal de detalle
  const [editing, setEditing]           = useState(false);
  const [editPersonas, setEditPersonas] = useState(2);
  const [editHora, setEditHora]         = useState("");

  // ── Load ─────────────────────────────────────────────────────────────────────
  const reload = useCallback(() => {
    syncAndLoadReservas(fecha).then(() => {
      setMesas(getMesasConEstado(fecha, servicio, horaPlano));
    }).catch(() => {
      setMesas(getMesasConEstado(fecha, servicio, horaPlano));
    });
  }, [fecha, servicio, horaPlano]);

  useEffect(() => { reload(); }, [reload]);

  // Al cambiar fecha o servicio, recolocar el visor del plano en su hora por defecto
  useEffect(() => { setHoraPlano(defaultHoraPlano(fecha, servicio)); }, [fecha, servicio]);

  // Realtime
  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb) return;
    const ch = sb.channel("mesa_view_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservas" }, () => reload())
      .subscribe();
    return () => { void ch.unsubscribe(); };
  }, [reload]);

  // Auto-refresh 60s
  useEffect(() => {
    const id = setInterval(() => { setTick((t) => t + 1); reload(); }, 60_000);
    return () => clearInterval(id);
  }, [reload]);

  void tick;

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const total     = mesas.length;
  const ocupadas  = mesas.filter((m) => m.status === "occupied").length;
  const reservadas = mesas.filter((m) => m.status === "reserved").length;
  const libres    = mesas.filter((m) => m.status === "available").length;

  // ── Walk-In ──────────────────────────────────────────────────────────────────
  function openWalkIn(m: MesaConEstado) {
    setWiMesa(m); setWiPersonas(m.capacidad); setWiNombre(""); setWiTelefono("");
    setWiNotas(""); setWiError(""); setWiOk(false); setWiGeneral(false); setWiSelectedId("");
  }
  function openWalkInGeneral() {
    setWiMesa({} as MesaConEstado); setWiPersonas(2); setWiNombre(""); setWiTelefono("");
    setWiNotas(""); setWiError(""); setWiOk(false); setWiGeneral(true); setWiSelectedId("");
  }
  function submitWalkIn() {
    const mesaId = wiGeneral ? wiSelectedId : wiMesa?.id;
    if (!mesaId) { setWiError("Selecciona una mesa"); return; }
    const res = createWalkInForMesa(mesaId, wiPersonas, wiNombre, wiTelefono, wiNotas);
    if (!res.ok) { setWiError(res.error); return; }
    const mesaNum = mesaId.replace("T", "");
    setWiOk(true); reload(); showToast(`T${mesaNum} — Walk-In registrado`);
  }
  function closeWalkIn() { setWiMesa(null); setWiOk(false); setWiError(""); setWiGeneral(false); setWiSelectedId(""); }

  // ── Nueva Reserva ────────────────────────────────────────────────────────────
  function openNueva() {
    setNNombre(""); setNTelefono(""); setNPersonas(2);
    setNHora(nowHHMM()); setNServicio(autoServicio()); setNMesaIds([]);
    setNNotas(""); setNError(""); setShowNueva(true);
  }
  // Nueva reserva pre-rellenada para una mesa concreta (al tocar mesa libre en una fecha futura)
  function openNuevaParaMesa(m: MesaConEstado) {
    setNNombre(""); setNTelefono(""); setNPersonas(Math.min(m.capacidad, 2));
    setNHora(horaPlano); setNServicio(servicio); setNMesaIds([m.id]);
    setNNotas(""); setNError(""); setShowNueva(true);
  }
  function submitNueva() {
    if (!nNombre.trim()) { setNError("El nombre es obligatorio"); return; }
    const res = createReserva({
      nombre: nNombre.trim(), telefono: nTelefono.trim(),
      personas: nPersonas, fecha, hora: nHora,
      servicio: nServicio, notas: nNotas.trim(),
      origen: "manual",
      ...(nMesaIds.length ? { forceMesaIds: nMesaIds } : {}),
    });
    if (!res.ok) { setNError(res.error); return; }
    setShowNueva(false); reload(); showToast("Reserva creada");
  }
  function toggleNMesa(id: string) {
    setNMesaIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }

  // ── Liberar ──────────────────────────────────────────────────────────────────
  function handleLiberar(r: ReservaLocal) {
    liberarMesa(r.id);
    if (r.origen === "online") {
      void fetch("/api/reservas/actualizar-estado", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, estado: "finished" }),
      });
    }
    setSel(null); reload(); showToast("Mesa liberada");
  }

  // ── Cancelar ─────────────────────────────────────────────────────────────────
  function handleCancelar(r: ReservaLocal) {
    updateEstado(r.id, "cancelada");
    if (r.origen === "online") {
      void fetch("/api/reservas/actualizar-estado", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, estado: "cancelada" }),
      });
    }
    setCancelReservaId(null); setSel(null); reload(); showToast("Reserva cancelada");
  }

  // ── Editar (personas + hora) ──────────────────────────────────────────────────
  function openEdit(r: ReservaLocal) {
    setEditPersonas(r.personas);
    setEditHora((r.hora || "").slice(0, 5));
    setEditing(true);
  }
  function submitEdit(r: ReservaLocal) {
    editReserva(r.id, { personas: editPersonas, hora: editHora });
    if (r.origen === "online") {
      void fetch("/api/reservas/actualizar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "editar", id: r.id, personas: editPersonas, hora: editHora }),
      });
    }
    setEditing(false); setSel(null); reload(); showToast("Reserva actualizada");
  }

  // ── Sentar ───────────────────────────────────────────────────────────────────
  function openSeat(r: ReservaLocal) {
    setSeatReserva(r); setSeatMesaIds(r.mesaIds.length ? r.mesaIds : []); setSeatError("");
  }
  function submitSeat() {
    if (!seatReserva) return;
    const res = sentarReserva(seatReserva.id, seatMesaIds.length ? seatMesaIds : undefined);
    if (!res.ok) { setSeatError(res.error); return; }
    if (seatReserva.origen === "online") {
      void fetch("/api/reservas/actualizar-estado", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: seatReserva.id, estado: "sentada" }),
      });
    }
    setSeatReserva(null); setSel(null); reload(); showToast("Mesa ocupada");
  }

  function handleMesaClick(m: MesaConEstado) {
    if (m.status === "available") {
      // Walk-In sólo tiene sentido HOY (es sentar a alguien ahora). Otra fecha → nueva reserva.
      if (fecha === hoy()) openWalkIn(m);
      else openNuevaParaMesa(m);
      return;
    }
    setEditing(false); setSel(m);
  }

  const mesasList: MesaLocal[] = MESAS_SEED;

  return (
    <div className="min-h-dvh p-4 text-gray-900 md:p-6">
      <div className="mx-auto max-w-4xl">
        <ReservasNav />

        {/* Top bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setSharedFecha(e.target.value); }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
          <div className="flex overflow-hidden rounded-lg border border-gray-300">
            {(["comida", "cena"] as const).map((s) => (
              <button key={s} onClick={() => setServicio(s)}
                className={`px-5 py-2 text-sm font-medium transition-colors ${
                  servicio === s ? "bg-karuma-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                }`}>
                {s === "comida" ? "🍱 Comida" : "🍣 Cena"}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={openWalkInGeneral}
              className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50">
              🚶 Walk-In
            </button>
            <button onClick={openNueva}
              className="flex items-center gap-2 rounded-lg bg-karuma-600 px-4 py-2 text-sm font-bold text-white hover:bg-karuma-700">
              <Plus className="h-4 w-4" /> Nueva reserva
            </button>
          </div>
        </div>

        {/* Time selector — 翻台 / turn-over */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400">
              Plano a las <span className="text-karuma-600">{horaPlano}</span>
            </p>
            <button onClick={() => setHoraPlano(defaultHoraPlano(fecha, servicio))}
              className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200">
              {fecha === hoy() ? "● Ahora" : "↻ Apertura"}
            </button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {slotsPlano(servicio).map((t) => (
              <button key={t} onClick={() => setHoraPlano(t)}
                className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
                  horaPlano === t ? "bg-karuma-600 text-white" : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                }`}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-5 grid grid-cols-4 gap-2">
          {[
            { label: "Total",      val: total,      cls: "text-gray-900"    },
            { label: "Ocupadas",   val: ocupadas,   cls: "text-red-600"     },
            { label: "Reservadas", val: reservadas, cls: "text-emerald-600" },
            { label: "Libres",     val: libres,     cls: "text-gray-500"    },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
              <p className={`text-2xl font-bold ${s.cls}`}>{s.val}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mb-5 flex flex-wrap gap-3 text-xs">
          {(Object.entries(STATUS_STYLE) as [keyof typeof STATUS_STYLE, (typeof STATUS_STYLE)[keyof typeof STATUS_STYLE]][]).map(([key, s]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-sm border-2 ${s.bg} ${s.border}`} />
              <span className="text-gray-500">{s.label}</span>
            </span>
          ))}
          <span className="text-gray-400">· Mesa libre → {fecha === hoy() ? "Walk-In directo" : "Nueva reserva"}</span>
        </div>

        {/* Mesa grid */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {mesas.map((m) => {
            const st = STATUS_STYLE[m.status];
            const r = m.reserva;
            const agenda = m.agenda ?? [];
            const otras = agenda.filter((x) => x.id !== r?.id); // otros turnos de la mesa ese día
            return (
              <button key={m.id} onClick={() => handleMesaClick(m)}
                className={`relative rounded-xl border-2 p-3.5 text-left transition-all hover:shadow-md active:scale-95 ${st.bg} ${st.border}`}>
                <span className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-bold ${st.badge}`}>
                  {st.label}
                </span>
                <p className="text-2xl font-black text-gray-900">T{m.numero}</p>
                <div className="flex items-center gap-1.5">
                  <p className="text-sm text-gray-400">{m.capacidad}p</p>
                  {agenda.length > 1 && (
                    <span className="rounded-full bg-gray-900 px-1.5 py-0.5 text-[11px] font-bold text-white"
                      title={`${agenda.length} reservas hoy`}>
                      {agenda.length} turnos
                    </span>
                  )}
                </div>
                {m.status === "occupied" && r && (
                  <div className="mt-2 space-y-1">
                    <p className="truncate text-base font-bold text-red-700">{r.nombre}</p>
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-red-500">
                      <Users className="h-4 w-4" />{r.personas}
                      <Clock className="ml-1.5 h-4 w-4" />{duracion(r.seatedAt)}
                    </div>
                  </div>
                )}
                {m.status === "reserved" && r && (
                  <div className="mt-2 space-y-0.5">
                    <p className="truncate text-base font-bold text-emerald-700">{r.nombre}</p>
                    <p className="text-sm font-semibold text-emerald-600">{r.hora} · {r.personas}p</p>
                  </div>
                )}
                {m.status === "available" && (
                  agenda.length > 0
                    ? <p className="mt-2 truncate text-sm font-semibold text-gray-500" title={agenda.map((a) => `${a.hora} ${a.nombre}`).join(" · ")}>Reservada: {agenda.map((a) => a.hora).join(", ")}</p>
                    : <p className="mt-2 text-sm text-gray-400">{fecha === hoy() ? "+ Walk-In" : "+ Reservar"}</p>
                )}
                {/* Otros turnos del día (翻台) */}
                {m.status !== "available" && otras.length > 0 && (
                  <p className="mt-1 truncate text-sm font-medium text-gray-500" title={otras.map((o) => `${o.hora} ${o.nombre}`).join(" · ")}>
                    +{otras.length}: {otras.map((o) => o.hora).join(", ")}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {ocupadas > 0 && (
          <div className="mt-5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
            <span className="font-bold text-gray-900">
              {mesas.filter((m) => m.status === "occupied").reduce((s, m) => s + (m.reserva?.personas ?? 0), 0)}
            </span>{" "}personas sentadas ·{" "}
            <span className="font-bold text-red-600">{ocupadas}</span> mesas ocupadas
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* ── Detail modal ──────────────────────────────────────────────────────── */}
      <Modal open={!!sel && !cancelReservaId} onClose={() => { setSel(null); setEditing(false); }}>
        {sel && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900">T{sel.numero}</h2>
                <p className="text-sm text-gray-500">{sel.capacidad} personas · Interior</p>
              </div>
              <button onClick={() => { setSel(null); setEditing(false); }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* ── Agenda del día (varios turnos / 翻台) ──────────────────────── */}
            {!editing && (sel.agenda?.length ?? 0) > 1 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                  Reservas del día · {sel.agenda!.length} turnos
                </p>
                <div className="space-y-1.5">
                  {sel.agenda!.map((a) => {
                    const actual = a.id === sel.reserva?.id;
                    return (
                      <div key={a.id}
                        className={`flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-sm ${actual ? "ring-2 ring-karuma-400" : "border border-gray-100"}`}>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="font-black text-gray-900">{a.hora}</span>
                          <span className="truncate text-gray-600">{a.nombre}</span>
                        </div>
                        <span className="shrink-0 text-xs text-gray-400">{a.personas}p · {ESTADO_CORTO[a.estado] ?? a.estado}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Edit mode (personas + hora) ───────────────────────────────── */}
            {editing && sel.reserva && (
              <>
                <div className="space-y-4 rounded-xl bg-gray-50 p-4">
                  <div>
                    <p className="mb-1.5 text-xs font-bold text-gray-500">Personas</p>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setEditPersonas((p) => Math.max(1, p - 1))}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-bold text-gray-700 shadow-sm active:scale-95">−</button>
                      <span className="flex-1 text-center text-3xl font-black text-gray-900">{editPersonas}</span>
                      <button onClick={() => setEditPersonas((p) => p + 1)}
                        className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-bold text-gray-700 shadow-sm active:scale-95">+</button>
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-bold text-gray-500">Hora</p>
                    <input type="time" value={editHora} onChange={(e) => setEditHora(e.target.value)} className={inp} />
                  </div>
                </div>
                <button onClick={() => submitEdit(sel.reserva!)}
                  className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white hover:bg-karuma-700">
                  Guardar cambios
                </button>
                <button onClick={() => setEditing(false)}
                  className="w-full rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                  Volver
                </button>
              </>
            )}

            {!editing && sel.status === "occupied" && sel.reserva && (
              <>
                <div className="rounded-xl bg-red-50 p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Cliente</span><span className="font-semibold">{sel.reserva.nombre}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Personas</span><span className="font-semibold">{sel.reserva.personas}</span></div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Entrada</span>
                    <span className="font-semibold">
                      {sel.reserva.seatedAt
                        ? new Date(sel.reserva.seatedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                        : sel.reserva.hora}
                    </span>
                  </div>
                  <div className="flex justify-between"><span className="text-gray-500">Tiempo</span><span className="font-bold text-red-600">{duracion(sel.reserva.seatedAt)}</span></div>
                  {sel.reserva.notas && (
                    <div className="flex justify-between"><span className="text-gray-500">Notas</span><span className="text-right max-w-[60%] text-gray-700">{sel.reserva.notas}</span></div>
                  )}
                </div>
                <button onClick={() => handleLiberar(sel.reserva!)}
                  className="w-full rounded-xl bg-gray-900 py-3 font-bold text-white hover:bg-gray-700">
                  ✓ Liberar mesa
                </button>
                <button onClick={() => openEdit(sel.reserva!)}
                  className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  ✏️ Editar personas / hora
                </button>
                <button onClick={() => setCancelReservaId(sel.reserva!.id)}
                  className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100">
                  Cancelar reserva
                </button>
              </>
            )}

            {!editing && sel.status === "reserved" && sel.reserva && (
              <>
                <div className="rounded-xl bg-emerald-50 p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Cliente</span><span className="font-semibold">{sel.reserva.nombre}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Hora</span><span className="font-semibold">{sel.reserva.hora}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Personas</span><span className="font-semibold">{sel.reserva.personas}</span></div>
                  {sel.reserva.telefono && (
                    <div className="flex justify-between"><span className="text-gray-500">Tel.</span><span>{sel.reserva.telefono}</span></div>
                  )}
                  {sel.reserva.notas && (
                    <div className="flex justify-between"><span className="text-gray-500">Notas</span><span className="text-right max-w-[60%] text-gray-700">{sel.reserva.notas}</span></div>
                  )}
                </div>
                <button onClick={() => { openSeat(sel.reserva!); setSel(null); }}
                  className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white hover:bg-karuma-700">
                  → Sentar / Ocupar mesa
                </button>
                <button onClick={() => openEdit(sel.reserva!)}
                  className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                  ✏️ Editar personas / hora
                </button>
                <button onClick={() => setCancelReservaId(sel.reserva!.id)}
                  className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100">
                  Cancelar reserva
                </button>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* ── Cancel confirm modal ─────────────────────────────────────────────── */}
      <Modal open={!!cancelReservaId} onClose={() => setCancelReservaId(null)}>
        {cancelReservaId && sel?.reserva && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-gray-900">¿Cancelar reserva?</h2>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{sel.reserva.nombre}</span> · {sel.reserva.hora} · {sel.reserva.personas} pax
            </p>
            <p className="text-sm text-gray-500">Esta acción no se puede deshacer.</p>
            <button onClick={() => handleCancelar(sel.reserva!)}
              className="w-full rounded-xl bg-red-600 py-3 font-bold text-white hover:bg-red-500">
              Sí, cancelar
            </button>
            <button onClick={() => setCancelReservaId(null)}
              className="w-full rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
              Volver
            </button>
          </div>
        )}
      </Modal>

      {/* ── Walk-In modal ────────────────────────────────────────────────────── */}
      <Modal open={!!wiMesa} onClose={closeWalkIn}>
        {wiMesa && (
          wiOk ? (
            <div className="space-y-4 text-center">
              <div className="rounded-xl bg-red-50 p-6">
                <p className="text-5xl font-black text-red-700">{wiGeneral ? wiSelectedId : `T${wiMesa.numero}`}</p>
                <p className="mt-2 font-bold text-red-600">Mesa ocupada · Walk-In</p>
                <p className="text-sm text-gray-500">{wiPersonas} personas</p>
              </div>
              <button onClick={closeWalkIn} className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white">Cerrar</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">
                    {wiGeneral ? "Walk-In" : `T${wiMesa.numero} — Walk-In`}
                  </h2>
                  <p className="text-sm text-gray-500">
                    {wiGeneral ? "Selecciona mesa y registra entrada directa" : `${wiMesa.capacidad} pax máx · Interior`}
                  </p>
                </div>
                <button onClick={closeWalkIn} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
              </div>
              {wiError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{wiError}</p>}
              {wiGeneral && (
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-400">Mesa *</label>
                  <div className="grid grid-cols-5 gap-1.5">
                    {mesasList.filter((m) => {
                      const mc = mesas.find((x) => x.id === m.id);
                      return !mc || mc.status === "available";
                    }).map((m) => (
                      <button key={m.id} onClick={() => setWiSelectedId(m.id)}
                        className={`rounded-lg border-2 px-2 py-1.5 text-center transition-colors ${
                          wiSelectedId === m.id
                            ? "border-red-500 bg-red-50 text-red-700 font-bold"
                            : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400"
                        }`}>
                        <p className="text-xs font-bold">T{m.numero}</p>
                        <p className="text-[10px] text-gray-500">{m.capacidad}p</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Personas *</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setWiPersonas(Math.max(1, wiPersonas - 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl font-bold hover:bg-gray-200">−</button>
                  <span className="flex-1 text-center text-4xl font-black">{wiPersonas}</span>
                  <button onClick={() => setWiPersonas(wiPersonas + 1)}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl font-bold hover:bg-gray-200">+</button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Nombre (opcional)</label>
                <input className={inp} placeholder="Walk-In" value={wiNombre} onChange={(e) => setWiNombre(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Teléfono (opcional)</label>
                <input className={inp} type="tel" placeholder="+34…" value={wiTelefono} onChange={(e) => setWiTelefono(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Notas</label>
                <textarea className={inp} rows={2} value={wiNotas} onChange={(e) => setWiNotas(e.target.value)} />
              </div>
              <button onClick={submitWalkIn}
                className="w-full rounded-xl bg-red-600 py-3.5 text-base font-black text-white hover:bg-red-500">
                {wiGeneral
                  ? wiSelectedId ? `Ocupar ${wiSelectedId} ahora` : "Ocupar mesa ahora"
                  : `Ocupar T${wiMesa.numero} ahora`}
              </button>
            </div>
          )
        )}
      </Modal>

      {/* ── Nueva Reserva modal ──────────────────────────────────────────────── */}
      <Modal open={showNueva} onClose={() => setShowNueva(false)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900">Nueva Reserva</h2>
            <button onClick={() => setShowNueva(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
          </div>
          {nError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{nError}</p>}

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Nombre *</label>
            <input className={inp} placeholder="Nombre del cliente" value={nNombre} onChange={(e) => setNNombre(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Teléfono</label>
            <input className={inp} type="tel" placeholder="+34…" value={nTelefono} onChange={(e) => setNTelefono(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Personas</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setNPersonas(Math.max(1, nPersonas - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 font-bold hover:bg-gray-200">−</button>
                <span className="flex-1 text-center text-xl font-black">{nPersonas}</span>
                <button onClick={() => setNPersonas(nPersonas + 1)}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 font-bold hover:bg-gray-200">+</button>
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Hora</label>
              <input type="time" className={inp} value={nHora} onChange={(e) => setNHora(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Servicio</label>
            <div className="flex overflow-hidden rounded-lg border border-gray-300">
              {(["comida", "cena"] as const).map((s) => (
                <button key={s} onClick={() => setNServicio(s)}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    nServicio === s ? "bg-karuma-600 text-white" : "bg-white text-gray-500"
                  }`}>
                  {s === "comida" ? "🍱 Comida" : "🍣 Cena"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Mesa (opcional — auto si vacío)</label>
            <MesaPicker mesas={mesasList} selectedIds={nMesaIds} onToggle={toggleNMesa} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Notas</label>
            <textarea className={inp} rows={2} value={nNotas} onChange={(e) => setNNotas(e.target.value)} />
          </div>
          <button onClick={submitNueva}
            className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white hover:bg-karuma-700">
            Crear reserva
          </button>
        </div>
      </Modal>

      {/* ── Seat modal ───────────────────────────────────────────────────────── */}
      <Modal open={!!seatReserva} onClose={() => setSeatReserva(null)}>
        {seatReserva && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">Sentar reserva</h2>
                <p className="text-sm text-gray-500">{seatReserva.nombre} · {seatReserva.personas} personas</p>
              </div>
              <button onClick={() => setSeatReserva(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            {seatError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{seatError}</p>}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">Mesa(s) — vacío = auto</p>
              <MesaPicker mesas={mesasList} selectedIds={seatMesaIds} onToggle={(id) => setSeatMesaIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])} />
            </div>
            <button onClick={submitSeat}
              className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white hover:bg-karuma-700">
              {seatMesaIds.length ? `Sentar en ${seatMesaIds.join(", ")}` : "Sentar (auto-asignar)"}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
