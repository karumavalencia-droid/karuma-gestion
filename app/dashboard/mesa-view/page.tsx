"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Users, Clock, Plus, ArrowRightLeft, Lock } from "lucide-react";
import { ReservasNav } from "@/components/reservas/ReservasNav";
import { KarumaLogo } from "@/components/brand/KarumaLogo";
import { TimeSlotPicker } from "@/components/reservas/TimeSlotPicker";
import {
  canMoveReservation,
  countReservedTables,
  getReservationGuests,
  getReservationService,
  isActiveReservation,
  isTableBlockReservation,
} from "@/lib/reservas/helpers";
import { syncAndLoadReservas } from "@/lib/reservas/sync";
import { getSharedServicio, setSharedServicio } from "@/lib/reservas/shared-view";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  getMesasConEstado,
  sentarReserva,
  liberarMesa,
  cambiarMesas,
  updateEstado,
  editReserva,
  mesaLabel,
  mesasDisponiblesParaCambio,
  slotsPlano,
  defaultHoraPlano,
  loadReservas,
  MESAS_SEED,
  type MesaConEstado,
  type MesaLocal,
  type ReservaLocal,
  type ServicioLocal,
} from "@/lib/reservas/local-store";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  available: { bg: "bg-white",        border: "border-gray-200",    badge: "bg-gray-100 text-gray-500",       label: "Libre"     },
  reserved:  { bg: "bg-emerald-100",  border: "border-emerald-300", badge: "bg-white/70 text-emerald-800",     label: "Reservada" },
  occupied:  { bg: "bg-emerald-700",  border: "border-emerald-800", badge: "bg-emerald-950/60 text-white",    label: "Ocupada"   },
  cleaning:  { bg: "bg-gray-100",     border: "border-gray-300",    badge: "bg-gray-200 text-gray-600",       label: "Limpieza"  },
};
const BLOCKED_STYLE = {
  bg: "bg-rose-100",
  border: "border-rose-300",
  badge: "bg-rose-700 text-white",
  label: "Bloqueada",
};

const ESTADO_CORTO: Record<string, string> = {
  pendiente: "Pendiente", confirmada: "Confirmada", llegada: "Llegada",
  sentada: "En mesa", walkin: "Walk-In", finished: "Finalizada",
  "no-show": "No Show", cancelada: "Cancelada",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hoy() { return new Date().toISOString().split("T")[0]; }
function autoServicio(): ServicioLocal { return new Date().getHours() >= 15 ? "cena" : "comida"; }
function fechaLarga(f: string): string {
  const s = new Date(f + "T12:00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" });
  return s.charAt(0).toUpperCase() + s.slice(1);  // "Domingo, 22 de junio"
}
const SERVICIO_LABEL: Record<ServicioLocal, string> = { comida: "Comida", cena: "Cena" };
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
function duracionBloqueoLabel(minutos?: number) {
  const total = minutos ?? 90;
  return total < 60 ? `${total} min` : `${Math.floor(total / 60)}h${total % 60 ? ` ${total % 60}m` : ""}`;
}
function canMoveLocalReservation(reserva: ReservaLocal): boolean {
  return !isTableBlockReservation(reserva) && canMoveReservation(reserva.estado) && reserva.mesaIds.length > 0;
}
function getMealStats(reservas: ReservaLocal[], servicio: ServicioLocal) {
  const activas = reservas.filter(
    (r) => isActiveReservation(r.estado) && getReservationService(r) === servicio && !isTableBlockReservation(r),
  );
  return {
    mesas: countReservedTables(activas),
    pax: activas.reduce((sum, r) => sum + getReservationGuests(r), 0),
  };
}
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
  const [servicio, setServicio] = useState<ServicioLocal>(() => getSharedServicio() ?? autoServicio());
  const [horaPlano, setHoraPlano] = useState(() => defaultHoraPlano(getSharedFecha(), autoServicio()));
  const [reservas, setReservas]   = useState<ReservaLocal[]>([]);
  const [mesas, setMesas]       = useState<MesaConEstado[]>([]);
  const [tick, setTick]         = useState(0);
  const [toast, setToast]       = useState("");

  // Selected mesa detail modal
  const [sel, setSel] = useState<MesaConEstado | null>(null);
  const [focusReservaId, setFocusReservaId] = useState<string | null>(null); // turno enfocado dentro de la mesa

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
  const [nEmail, setNEmail]           = useState("");
  const [nPersonas, setNPersonas]     = useState(2);
  const [nHora, setNHora]             = useState(() => defaultHoraPlano(getSharedFecha(), autoServicio()));
  const [nServicio, setNServicio]     = useState<ServicioLocal>(autoServicio);
  const [nMesaIds, setNMesaIds]       = useState<string[]>([]);
  const [nNotas, setNNotas]           = useState("");
  const [nError, setNError]           = useState("");

  // Bloquear mesa modal
  const [showBlock, setShowBlock] = useState(false);
  const [bFecha, setBFecha] = useState(getSharedFecha);
  const [bHora, setBHora] = useState(() => defaultHoraPlano(getSharedFecha(), autoServicio()));
  const [bServicio, setBServicio] = useState<ServicioLocal>(autoServicio);
  const [bDuracion, setBDuracion] = useState(90);
  const [bMesaIds, setBMesaIds] = useState<string[]>([]);
  const [bNotas, setBNotas] = useState("");
  const [bError, setBError] = useState("");

  // Seat modal
  const [seatReserva, setSeatReserva] = useState<ReservaLocal | null>(null);
  const [seatMesaIds, setSeatMesaIds] = useState<string[]>([]);
  const [seatError, setSeatError]     = useState("");

  // Move occupied party to another available table
  const [moveReserva, setMoveReserva] = useState<ReservaLocal | null>(null);
  const [moveMesaIds, setMoveMesaIds] = useState<string[]>([]);
  const [moveError, setMoveError]     = useState("");

  // Cancel confirm
  const [cancelReservaId, setCancelReservaId] = useState<string | null>(null);

  // Edit (personas + hora) inline en el modal de detalle
  const [editing, setEditing]           = useState(false);
  const [editPersonas, setEditPersonas] = useState(2);
  const [editHora, setEditHora]         = useState("");
  const [editError, setEditError]       = useState("");

  // ── Load ─────────────────────────────────────────────────────────────────────
  const reload = useCallback(() => {
    syncAndLoadReservas(fecha).then((all) => {
      setReservas(all);
      setMesas(getMesasConEstado(fecha, servicio, horaPlano));
    }).catch(() => {
      setReservas(loadReservas().filter((r) => r.fecha === fecha));
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
  const selectServicio = (nextServicio: ServicioLocal) => {
    setServicio(nextServicio);
    setSharedServicio(nextServicio);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────────
  const total     = mesas.length;
  const ocupadas  = mesas.filter((m) => m.status === "occupied").length;
  const bloqueadas = mesas.filter((m) => (m.agenda ?? []).some((r) => isTableBlockReservation(r))).length;
  const reservadas = mesas.filter((m) =>
    (m.status === "reserved" && m.reserva && !isTableBlockReservation(m.reserva)) ||
    (m.status === "available" && (m.agenda ?? []).some((r) => !isTableBlockReservation(r))),
  ).length;
  const libres    = mesas.filter((m) => m.status === "available" && (m.agenda?.length ?? 0) === 0).length;
  // Nº total de reservas del servicio (todos los turnos del día), para el estado vacío
  const reservasDia = mesas.reduce((n, m) => n + (m.agenda?.length ?? 0), 0);
  const statsComida = getMealStats(reservas, "comida");
  const statsCena = getMealStats(reservas, "cena");

  // ── Walk-In ──────────────────────────────────────────────────────────────────
  function openWalkIn(m: MesaConEstado) {
    setWiMesa(m); setWiPersonas(m.capacidad); setWiNombre(""); setWiTelefono("");
    setWiNotas(""); setWiError(""); setWiOk(false); setWiGeneral(false); setWiSelectedId("");
  }
  function openWalkInGeneral() {
    setWiMesa({} as MesaConEstado); setWiPersonas(2); setWiNombre(""); setWiTelefono("");
    setWiNotas(""); setWiError(""); setWiOk(false); setWiGeneral(true); setWiSelectedId("");
  }
  async function submitWalkIn() {
    const mesaId = wiGeneral ? wiSelectedId : wiMesa?.id;
    if (!mesaId) { setWiError("Selecciona una mesa"); return; }
    setWiError("");
    try {
      const response = await fetch("/api/reservas/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: hoy(),
          hora: new Date().toTimeString().slice(0, 5),
          servicio: autoServicio(),
          personas: wiPersonas,
          nombre: wiNombre || "Walk-In",
          telefono: wiTelefono.trim(),
          notas: wiNotas,
          origen: "walkin",
          forceMesaIds: [Number(mesaId.replace("T", ""))],
        }),
      });
      const json = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) {
        setWiError(json.error ?? "No se pudo registrar el Walk-In.");
        return;
      }
      const mesaNum = mesaId.replace("T", "");
      setWiOk(true); reload(); showToast(`T${mesaNum} — Walk-In registrado`);
    } catch {
      setWiError("No se pudo registrar el Walk-In.");
    }
  }
  function closeWalkIn() { setWiMesa(null); setWiOk(false); setWiError(""); setWiGeneral(false); setWiSelectedId(""); }

  // ── Nueva Reserva ────────────────────────────────────────────────────────────
  function openNueva() {
    setNNombre(""); setNTelefono(""); setNEmail(""); setNPersonas(2);
    setNHora(defaultHoraPlano(fecha, servicio)); setNServicio(servicio); setNMesaIds([]);
    setNNotas(""); setNError(""); setShowNueva(true);
  }
  // Nueva reserva pre-rellenada para una mesa concreta (al tocar mesa libre en una fecha futura)
  function openNuevaParaMesa(m: MesaConEstado) {
    setNNombre(""); setNTelefono(""); setNEmail(""); setNPersonas(Math.min(m.capacidad, 2));
    setNHora(horaPlano); setNServicio(servicio); setNMesaIds([m.id]);
    setNNotas(""); setNError(""); setShowNueva(true);
  }
  async function submitNueva() {
    if (!nNombre.trim()) { setNError("El nombre es obligatorio"); return; }
    if (!nTelefono.trim()) { setNError("El teléfono es obligatorio para sincronizar la reserva."); return; }
    setNError("");
    try {
      const response = await fetch("/api/reservas/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nNombre.trim(),
          telefono: nTelefono.trim(),
          email: nEmail.trim() || undefined,
          personas: nPersonas,
          fecha,
          hora: nHora,
          servicio: nServicio,
          notas: nNotas.trim(),
          origen: "manual",
          forceMesaIds: nMesaIds.length ? nMesaIds.map((id) => Number(id.replace("T", ""))) : undefined,
        }),
      });
      const json = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) {
        setNError(json.error ?? "No se pudo crear la reserva.");
        return;
      }
      setShowNueva(false); reload(); showToast("Reserva creada");
    } catch {
      setNError("No se pudo crear la reserva.");
    }
  }
  function toggleNMesa(id: string) {
    setNMesaIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }

  // ── Bloquear mesa ───────────────────────────────────────────────────────────
  function openBlock(m?: MesaConEstado) {
    setBFecha(fecha);
    setBServicio(servicio);
    setBHora(horaPlano);
    setBDuracion(90);
    setBMesaIds(m ? [m.id] : []);
    setBNotas("");
    setBError("");
    setShowBlock(true);
  }
  function toggleBMesa(id: string) {
    setBMesaIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id]);
  }
  async function submitBlock() {
    if (!bMesaIds.length) { setBError("Selecciona al menos una mesa."); return; }
    setBError("");
    try {
      const response = await fetch("/api/reservas/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bloqueo: true,
          fecha: bFecha,
          hora: bHora,
          servicio: bServicio,
          duracionMin: bDuracion,
          personas: 0,
          nombre: "Bloqueo mesa",
          telefono: "",
          notas: bNotas.trim(),
          origen: "manual",
          forceMesaIds: bMesaIds.map((id) => Number(id.replace("T", ""))),
        }),
      });
      const json = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) {
        setBError(json.error ?? "No se pudo bloquear la mesa.");
        return;
      }
      const destino = mesaLabel(bMesaIds);
      setShowBlock(false);
      reload();
      showToast(`${destino} bloqueada`);
    } catch {
      setBError("No se pudo bloquear la mesa.");
    }
  }

  // ── Liberar ──────────────────────────────────────────────────────────────────
  function handleLiberar(r: ReservaLocal) {
    liberarMesa(r.id);
    if (r.origen) {
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
    if (r.origen) {
      void fetch("/api/reservas/actualizar-estado", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, estado: "cancelada" }),
      });
    }
    setCancelReservaId(null); setSel(null); reload(); showToast(isTableBlockReservation(r) ? "Mesa desbloqueada" : "Reserva cancelada");
  }

  // ── Editar (personas + hora) ──────────────────────────────────────────────────
  function openEdit(r: ReservaLocal) {
    setEditPersonas(r.personas);
    setEditHora((r.hora || "").slice(0, 5));
    setEditError("");
    setEditing(true);
  }
  function submitEdit(r: ReservaLocal) {
    setEditError("");
    const res = editReserva(r.id, { personas: editPersonas, hora: editHora });
    if (!res.ok) { setEditError(res.error); return; }
    if (r.origen) {
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
    if (seatReserva.origen) {
      void fetch("/api/reservas/actualizar-estado", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: seatReserva.id, estado: "sentada" }),
      });
    }
    setSeatReserva(null); setSel(null); reload(); showToast("Mesa ocupada");
  }

  // ── Cambiar mesa ─────────────────────────────────────────────────────────────
  function openMove(r: ReservaLocal) {
    setMoveReserva(r);
    setMoveMesaIds([]);
    setMoveError("");
  }
  function submitMove() {
    if (!moveReserva) return;
    const res = cambiarMesas(moveReserva.id, moveMesaIds);
    if (!res.ok) { setMoveError(res.error); return; }
    if (moveReserva.origen) {
      void fetch("/api/reservas/actualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cambiar-mesa",
          id: moveReserva.id,
          mesaIds: moveMesaIds.map((id) => Number(id.replace("T", ""))),
        }),
      });
    }
    const destino = mesaLabel(moveMesaIds);
    setMoveReserva(null); setSel(null); reload(); showToast(`Cliente trasladado a ${destino}`);
  }

  function handleMesaClick(m: MesaConEstado) {
    const agenda = m.agenda ?? [];
    // Mesa libre SIN ninguna reserva del día → crear directamente
    if (m.status === "available" && agenda.length === 0) {
      if (fecha === hoy()) openWalkIn(m);   // hoy → walk-in (ahora)
      else openNuevaParaMesa(m);            // otra fecha → nueva reserva
      return;
    }
    // Mesa con reservas (en este momento o en otros turnos del día) → abrir detalle
    setEditing(false);
    setEditError("");
    setFocusReservaId(m.reserva?.id ?? agenda[0]?.id ?? null);
    setSel(m);
  }

  const mesasList: MesaLocal[] = MESAS_SEED;

  return (
    <div className="mesa-page min-h-full bg-[#f7f3ec] p-4 text-gray-900 md:p-6">
      <style>{`
        @media (min-width: 768px) and (max-width: 1535px) {
          .mesa-page {
            height: 100%;
            min-height: 0;
            overflow: hidden;
            padding: 0.75rem;
          }
          .mesa-page-inner {
            display: flex;
            height: 100%;
            max-width: none;
            flex-direction: column;
          }
          .mesa-tablet-hide {
            display: none !important;
          }
          .mesa-tablet-toolbar {
            display: flex !important;
          }
          .mesa-grid {
            min-height: 0;
            flex: 1 1 0%;
            grid-template-columns: repeat(5, minmax(0, 1fr));
            grid-template-rows: repeat(5, minmax(0, 1fr));
            gap: 0.5rem;
          }
          .mesa-card {
            min-height: 0;
            overflow: hidden;
            border-radius: 0.9rem;
            padding: 0.65rem;
          }
          .mesa-card-status {
            right: 0.4rem;
            top: 0.4rem;
            padding: 0.1rem 0.35rem;
            font-size: 0.625rem;
          }
          .mesa-card-number {
            font-size: 1.35rem;
            line-height: 1.3;
          }
          .mesa-card-detail {
            margin-top: 0.3rem;
          }
          .mesa-card-detail-name {
            font-size: 0.82rem;
            line-height: 1.15rem;
          }
          .mesa-card-detail-meta {
            font-size: 0.72rem;
            line-height: 1rem;
          }
          .mesa-status-full {
            display: none;
          }
          .mesa-status-compact {
            display: inline;
          }
        }
        @media (min-width: 768px) and (max-width: 1535px) and (orientation: landscape) {
          .mesa-grid {
            grid-template-columns: repeat(7, minmax(0, 1fr));
            grid-template-rows: repeat(3, minmax(0, 1fr));
          }
        }
      `}</style>
      <div className="mesa-page-inner mx-auto max-w-5xl">
        <div className="mesa-tablet-hide">
          <ReservasNav />
        </div>

        {/* Vista compacta para tablet: controles esenciales + las 21 mesas */}
        <div className="mesa-tablet-toolbar mb-2 hidden shrink-0 flex-wrap items-center gap-2 rounded-2xl border border-white/80 bg-white p-2.5 shadow-sm">
          <div className="mr-auto min-w-[8rem]">
            <p className="text-base font-black leading-tight text-gray-900">Plano de mesas</p>
            <p className="truncate text-[11px] font-medium text-gray-500">{fechaLarga(fecha)}</p>
          </div>
          <input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setSharedFecha(e.target.value); }}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs font-semibold text-gray-700 focus:border-karuma-500 focus:outline-none" />
          <div className="flex overflow-hidden rounded-lg border border-gray-300">
            {(["comida", "cena"] as const).map((s) => (
              <button key={s} onClick={() => selectServicio(s)}
                className={`px-3 py-2 text-xs font-bold transition-colors ${
                  servicio === s ? "bg-karuma-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                }`}>
                {s === "comida" ? "🍱 Comida" : "🍣 Cena"}
              </button>
            ))}
          </div>
          <select value={horaPlano} onChange={(e) => setHoraPlano(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-xs font-black text-karuma-700 focus:border-karuma-500 focus:outline-none">
            {slotsPlano(servicio).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <div className="flex items-center gap-1 text-[11px] font-bold">
            <span className="rounded-full bg-gray-100 px-2 py-1 text-gray-600">{total} total</span>
            <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">{reservadas} reservadas</span>
            <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-800">{bloqueadas} bloqueadas</span>
            <span className="rounded-full bg-emerald-700 px-2 py-1 text-white">{ocupadas} ocupadas</span>
            <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">Comida {statsComida.mesas}M/{statsComida.pax}P</span>
            <span className="rounded-full bg-indigo-100 px-2 py-1 text-indigo-800">Cena {statsCena.mesas}M/{statsCena.pax}P</span>
          </div>
          <button onClick={() => openBlock()}
            className="flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100">
            <Lock className="h-3.5 w-3.5" /> Bloquear
          </button>
          <button onClick={openWalkInGeneral}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50">
            🚶 Walk-In
          </button>
          <button onClick={openNueva}
            className="flex items-center gap-1 rounded-lg bg-karuma-600 px-3 py-2 text-xs font-bold text-white hover:bg-karuma-700">
            <Plus className="h-3.5 w-3.5" /> Nueva
          </button>
        </div>

        {/* ── Encabezado: tarea principal + acciones ─────────────────────────── */}
        <div className="mesa-tablet-hide mb-5 rounded-[1.5rem] border border-white/70 bg-white px-5 py-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="w-44 sm:w-52">
              <KarumaLogo tone="dark" />
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-gray-900 sm:text-3xl">Plano de mesas</h1>
            <p className="mt-1 text-sm text-gray-500">{fechaLarga(fecha)} · {SERVICIO_LABEL[servicio]} · cambia fecha, servicio o franja para ver disponibilidad real</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => openBlock()}
              className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 transition-colors hover:bg-rose-100">
              <Lock className="h-4 w-4" /> Bloquear mesa
            </button>
            <button onClick={openWalkInGeneral}
              className="flex items-center gap-2 rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition-colors hover:bg-gray-50">
              🚶 Walk-In
            </button>
            <button onClick={openNueva}
              className="flex items-center gap-2 rounded-2xl bg-karuma-600 px-5 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-karuma-700">
              <Plus className="h-4 w-4" /> Nueva reserva
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-gray-600">
            <span className="rounded-full bg-gray-50 px-3 py-1 font-semibold">Toca una mesa libre para abrir un alta rápida</span>
            <span className="rounded-full bg-gray-50 px-3 py-1 font-semibold">Las mesas con agenda muestran su siguiente turno</span>
          </div>
        </div>
        </div>

        {/* ── Controles: fecha + servicio ────────────────────────────────────── */}
        <div className="mesa-tablet-hide mb-4 flex flex-wrap items-center gap-2">
          <input type="date" value={fecha} onChange={(e) => { setFecha(e.target.value); setSharedFecha(e.target.value); }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-karuma-500 focus:outline-none" />
          <div className="flex overflow-hidden rounded-lg border border-gray-300">
            {(["comida", "cena"] as const).map((s) => (
              <button key={s} onClick={() => selectServicio(s)}
                className={`px-5 py-2 text-sm font-semibold transition-colors ${
                  servicio === s ? "bg-karuma-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                }`}>
                {s === "comida" ? "🍱 Comida" : "🍣 Cena"}
              </button>
            ))}
          </div>
        </div>

        {/* ── Estadística por servicio ──────────────────────────────────────── */}
        <div className="mesa-tablet-hide mb-4 grid grid-cols-2 gap-3">
          {[
            { label: "Comida", icon: "🍱", stats: statsComida, tone: "amber" },
            { label: "Cena", icon: "🍣", stats: statsCena, tone: "indigo" },
          ].map(({ label, icon, stats, tone }) => (
            <div
              key={label}
              className={`rounded-[1.25rem] border bg-white p-4 shadow-sm ${
                tone === "amber" ? "border-amber-200" : "border-indigo-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className={`text-sm font-black ${tone === "amber" ? "text-amber-700" : "text-indigo-700"}`}>
                  {icon} {label}
                </p>
                <p className="text-xs font-semibold text-gray-400">Reservas activas</p>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div>
                  <p className={`text-3xl font-black leading-none ${tone === "amber" ? "text-amber-800" : "text-indigo-800"}`}>
                    {stats.mesas}
                  </p>
                  <p className="mt-1 text-xs font-medium text-gray-500">mesas reservadas</p>
                </div>
                <div>
                  <p className={`text-3xl font-black leading-none ${tone === "amber" ? "text-amber-800" : "text-indigo-800"}`}>
                    {stats.pax}
                  </p>
                  <p className="mt-1 text-xs font-medium text-gray-500">pax</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Eje de tiempo: estado del plano por franja */}
        <div className="mesa-tablet-hide mb-4 rounded-[1.25rem] border border-gray-200 bg-white p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Estado del plano a las <span className="text-base font-black text-karuma-600">{horaPlano}</span>
            </p>
            <button onClick={() => setHoraPlano(defaultHoraPlano(fecha, servicio))}
              className="shrink-0 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-600 transition-colors hover:bg-gray-200">
              {fecha === hoy() ? "● Ahora" : "↻ Apertura"}
            </button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {slotsPlano(servicio).map((t) => {
              const esAhora = fecha === hoy() && t === defaultHoraPlano(fecha, servicio);
              return (
                <button key={t} onClick={() => setHoraPlano(t)}
                  className={`relative shrink-0 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors ${
                    horaPlano === t ? "bg-karuma-600 text-white"
                      : "border border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
                  }`}>
                  {t}
                  {esAhora && horaPlano !== t && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-karuma-500 ring-2 ring-white" title="Ahora" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Tarjetas de estado (mismos colores que el plano = leyenda) ─────── */}
        <div className="mesa-tablet-hide mb-3 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
          {[
            { label: "Total",      val: total,      bar: "bg-gray-800",    num: "text-gray-900"    },
            { label: "Libres",     val: libres,     bar: "bg-gray-300",    num: "text-gray-700"    },
            { label: "Reservadas", val: reservadas, bar: "bg-emerald-300", num: "text-emerald-700" },
            { label: "Bloqueadas", val: bloqueadas, bar: "bg-rose-400",    num: "text-rose-700" },
            { label: "Ocupadas",   val: ocupadas,   bar: "bg-emerald-700", num: "text-emerald-800" },
          ].map((s) => (
            <div key={s.label} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
              <span className={`h-9 w-1.5 shrink-0 rounded-full ${s.bar}`} />
              <div className="min-w-0">
                <p className={`text-2xl font-black leading-none ${s.num}`}>{s.val}</p>
                <p className="mt-1 text-xs font-medium text-gray-400">{s.label}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="mesa-tablet-hide mb-4 text-xs text-gray-500">
          Toca una mesa libre para {fecha === hoy() ? "registrar un walk-in" : "crear una reserva"} · una mesa reservada u ocupada para abrir su detalle.
        </p>

        {reservasDia > 0 && (
          <div className="mesa-tablet-hide mb-4 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
            <span className="font-bold text-gray-900">{reservasDia}</span> turnos en agenda para esta franja · revisa las mesas con más de un turno para evitar cruces.
          </div>
        )}

        {/* Estado vacío: sin reservas en el servicio */}
        {reservasDia === 0 && (
          <div className="mesa-tablet-hide mb-4 flex flex-col items-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50/70 px-5 py-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="text-base font-bold text-gray-900">Aún no hay reservas para {servicio === "comida" ? "la comida" : "la cena"}</p>
              <p className="mt-0.5 text-sm text-gray-500">Las {total} mesas están libres. Crea la primera reserva o registra un walk-in para empezar.</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <button onClick={() => openBlock()}
                className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-700 hover:bg-rose-100">
                Bloquear mesa
              </button>
              <button onClick={openWalkInGeneral}
                className="rounded-2xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 hover:bg-gray-50">
                🚶 Walk-In
              </button>
              <button onClick={openNueva}
                className="rounded-2xl bg-karuma-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-karuma-700">
                + Nueva reserva
              </button>
            </div>
          </div>
        )}

        {/* Plano: cuadrícula de mesas */}
        <div className="mesa-grid grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {mesas.map((m) => {
            const r = m.reserva;
            const agenda = m.agenda ?? [];
            const proxima = m.status === "available" ? agenda[0] : undefined;
            const shownReserva = r ?? proxima;
            const isBlocked = !!shownReserva && isTableBlockReservation(shownReserva);
            const visualStatus = proxima ? "reserved" : m.status;
            const st = isBlocked ? BLOCKED_STYLE : STATUS_STYLE[visualStatus];
            const occupied = m.status === "occupied";
            const otras = agenda.filter((x) => x.id !== r?.id); // otros turnos de la mesa ese día
            return (
              <button key={m.id} onClick={() => handleMesaClick(m)}
                className={`mesa-card relative rounded-2xl border-2 p-3.5 text-left transition-all hover:shadow-md active:scale-95 ${st.bg} ${st.border}`}>
                <span className={`mesa-card-status absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-bold ${st.badge}`}>
                  <span className="mesa-status-full">
                    {proxima ? `${isBlocked ? "Bloq" : "Próx"} ${proxima.hora}` : st.label}
                  </span>
                  <span className="mesa-status-compact hidden">
                    {proxima ? `${isBlocked ? "Bloq" : "Próx"} ${proxima.hora}` : isBlocked ? "Bloq" : m.status === "reserved" ? "Reserva" : m.status === "occupied" ? "Ocupada" : m.status === "cleaning" ? "Limpieza" : "Libre"}
                  </span>
                </span>
                <p className={`mesa-card-number text-2xl font-black ${occupied ? "text-white" : "text-gray-900"}`}>T{m.numero}</p>
                <div className="flex items-center gap-1.5">
                  <p className={`text-sm ${occupied ? "text-emerald-100" : "text-gray-400"}`}>{m.capacidad}p</p>
                  {agenda.length > 1 && (
                    <span className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold text-white ${occupied ? "bg-white/20" : "bg-gray-900"}`}
                      title={`${agenda.length} reservas hoy`}>
                      {agenda.length} turnos
                    </span>
                  )}
                </div>
                {m.status === "occupied" && r && (
                  <div className="mesa-card-detail mt-2 space-y-1">
                    <p className="mesa-card-detail-name truncate text-base font-bold text-white">{r.nombre}</p>
                    <div className="mesa-card-detail-meta flex items-center gap-1.5 text-sm font-semibold text-emerald-100">
                      <Users className="h-4 w-4" />{r.personas}
                      <Clock className="ml-1.5 h-4 w-4" />{duracion(r.seatedAt)}
                    </div>
                  </div>
                )}
                {m.status === "reserved" && r && isTableBlockReservation(r) && (
                  <div className="mesa-card-detail mt-2 space-y-0.5">
                    <p className="mesa-card-detail-name truncate text-base font-bold text-rose-800">Bloqueo mesa</p>
                    <p className="mesa-card-detail-meta text-sm font-semibold text-rose-700">{r.hora} · {duracionBloqueoLabel(r.duracionMin)}</p>
                  </div>
                )}
                {m.status === "reserved" && r && !isTableBlockReservation(r) && (
                  <div className="mesa-card-detail mt-2 space-y-0.5">
                    <p className="mesa-card-detail-name truncate text-base font-bold text-emerald-700">{r.nombre}</p>
                    <p className="mesa-card-detail-meta text-sm font-semibold text-emerald-600">{r.hora} · {r.personas}p</p>
                  </div>
                )}
                {m.status === "available" && (
                  agenda.length > 0
                    ? <div className="mesa-card-detail mt-2 space-y-0.5">
                        <p className={`mesa-card-detail-name truncate text-base font-bold ${isTableBlockReservation(agenda[0]) ? "text-rose-800" : "text-emerald-900"}`}>
                          {isTableBlockReservation(agenda[0]) ? "Bloqueo mesa" : agenda[0].nombre}
                        </p>
                        <p className={`mesa-card-detail-meta truncate text-sm font-semibold ${isTableBlockReservation(agenda[0]) ? "text-rose-700" : "text-emerald-700"}`} title={agenda.map((a) => `${a.hora} ${a.nombre}`).join(" · ")}>
                          {isTableBlockReservation(agenda[0]) ? "Bloqueada" : "Reservada"} · {agenda[0].hora}{agenda.length > 1 ? ` +${agenda.length - 1}` : ""}
                        </p>
                      </div>
                    : <p className="mesa-card-detail mesa-card-detail-meta mt-2 text-sm text-gray-400">{fecha === hoy() ? "+ Walk-In" : "+ Reservar"}</p>
                )}
                {/* Otros turnos del día */}
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
          <div className="mesa-tablet-hide mt-5 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
            <span className="font-bold text-gray-900">
              {mesas.filter((m) => m.status === "occupied").reduce((s, m) => s + (m.reserva?.personas ?? 0), 0)}
            </span>{" "}personas sentadas ·{" "}
            <span className="font-bold text-emerald-800">{ocupadas}</span> mesas ocupadas
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* ── Detail modal ──────────────────────────────────────────────────────── */}
      <Modal open={!!sel && !cancelReservaId} onClose={() => { setSel(null); setEditing(false); setEditError(""); }}>
        {sel && (() => {
          const agenda = sel.agenda ?? [];
          const focusR = agenda.find((a) => a.id === focusReservaId) ?? sel.reserva ?? agenda[0] ?? null;
          const focusOcc = !!focusR && (focusR.estado === "sentada" || focusR.estado === "walkin");
          const focusBlock = !!focusR && isTableBlockReservation(focusR);
          const focusCanMove = !!focusR && canMoveLocalReservation(focusR);
          return (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900">T{sel.numero}</h2>
                <p className="text-sm text-gray-500">{sel.capacidad} personas · Interior</p>
              </div>
              <button onClick={() => { setSel(null); setEditing(false); setEditError(""); }} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Agenda del día: toca un turno para verlo o editarlo */}
            {!editing && agenda.length > 1 && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
                  Reservas del día · {agenda.length} turnos
                </p>
                <div className="space-y-1.5">
                  {agenda.map((a) => {
                    const actual = a.id === focusR?.id;
                    return (
                      <button key={a.id} onClick={() => setFocusReservaId(a.id)}
                        className={`flex w-full items-center justify-between rounded-lg bg-white px-2.5 py-2 text-sm transition-all ${actual ? "ring-2 ring-karuma-400" : "border border-gray-100 hover:bg-gray-50"}`}>
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="font-black text-gray-900">{a.hora}</span>
                          <span className="truncate text-gray-600">{a.nombre}</span>
                        </div>
                        <span className="shrink-0 text-xs text-gray-400">
                          {isTableBlockReservation(a) ? "Bloqueo" : `${a.personas}p`} · {ESTADO_CORTO[a.estado] ?? a.estado}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── Edit mode (personas + hora) ───────────────────────────────── */}
            {editing && focusR && (
              <>
                <div className="mb-1 text-sm font-semibold text-gray-500">Editando turno de las {focusR.hora}</div>
                {editError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{editError}</p>}
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
                    <TimeSlotPicker
                      value={editHora}
                      onChange={setEditHora}
                      servicio={focusR.servicio}
                      compact
                    />
                  </div>
                </div>
                <button onClick={() => submitEdit(focusR)}
                  className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white hover:bg-karuma-700">
                  Guardar cambios
                </button>
                <button onClick={() => { setEditing(false); setEditError(""); }}
                  className="w-full rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
                  Volver
                </button>
              </>
            )}

            {/* ── Turno enfocado: info + acciones ───────────────────────────── */}
            {!editing && focusR && (
              <>
                <div className={`rounded-xl p-4 space-y-2 text-sm ${focusOcc ? "bg-emerald-700 text-white" : focusBlock ? "bg-rose-100 text-rose-950" : "bg-emerald-100"}`}>
                  <div className="flex justify-between">
                    <span className={focusOcc ? "text-emerald-100" : focusBlock ? "text-rose-600" : "text-gray-500"}>{focusBlock ? "Tipo" : "Cliente"}</span>
                    <span className="font-semibold">{focusBlock ? "Bloqueo mesa" : focusR.nombre}</span>
                  </div>
                  <div className="flex justify-between"><span className={focusOcc ? "text-emerald-100" : focusBlock ? "text-rose-600" : "text-gray-500"}>Hora</span><span className="font-semibold">{focusR.hora}</span></div>
                  {focusBlock ? (
                    <div className="flex justify-between"><span className="text-rose-600">Duración</span><span className="font-semibold">{duracionBloqueoLabel(focusR.duracionMin)}</span></div>
                  ) : (
                    <div className="flex justify-between"><span className={focusOcc ? "text-emerald-100" : "text-gray-500"}>Personas</span><span className="font-semibold">{focusR.personas}</span></div>
                  )}
                  {focusOcc && (
                    <div className="flex justify-between"><span className="text-emerald-100">Tiempo</span><span className="font-bold text-white">{duracion(focusR.seatedAt)}</span></div>
                  )}
                  {!focusBlock && focusR.telefono && (
                    <div className="flex justify-between"><span className={focusOcc ? "text-emerald-100" : "text-gray-500"}>Tel.</span><span>{focusR.telefono}</span></div>
                  )}
                  {focusR.notas && (
                    <div className="flex justify-between"><span className={focusOcc ? "text-emerald-100" : focusBlock ? "text-rose-600" : "text-gray-500"}>Notas</span><span className={`max-w-[60%] text-right ${focusOcc ? "text-white" : focusBlock ? "text-rose-950" : "text-gray-700"}`}>{focusR.notas}</span></div>
                  )}
                </div>
                {focusBlock ? (
                  <button onClick={() => setCancelReservaId(focusR.id)}
                    className="w-full rounded-xl bg-rose-700 py-3 font-bold text-white hover:bg-rose-600">
                    Desbloquear mesa
                  </button>
                ) : focusOcc ? (
                  <button onClick={() => handleLiberar(focusR)}
                    className="w-full rounded-xl bg-gray-900 py-3 font-bold text-white hover:bg-gray-700">
                    ✓ Liberar mesa
                  </button>
                ) : (
                  <button onClick={() => { openSeat(focusR); setSel(null); }}
                    className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white hover:bg-karuma-700">
                    → Sentar / Ocupar mesa
                  </button>
                )}
                {focusCanMove && (
                  <button onClick={() => { openMove(focusR); setSel(null); }}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 py-2.5 text-sm font-bold text-emerald-800 hover:bg-emerald-100">
                    <ArrowRightLeft className="h-4 w-4" />
                    Cambiar mesa
                  </button>
                )}
                {!focusBlock && (
                  <>
                    <button onClick={() => openEdit(focusR)}
                      className="w-full rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50">
                      ✏️ Editar personas / hora
                    </button>
                    <button onClick={() => setCancelReservaId(focusR.id)}
                      className="w-full rounded-xl border border-red-200 bg-red-50 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-100">
                      Cancelar reserva
                    </button>
                  </>
                )}
              </>
            )}

            {/* Crear otra reserva en esta mesa (libre en el momento mostrado) */}
            {!editing && sel.status === "available" && (
              <div className="space-y-2">
                <button onClick={() => { openBlock(sel); setSel(null); }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100">
                  <Lock className="h-4 w-4" /> Bloquear T{sel.numero}
                </button>
                <button onClick={() => { openNuevaParaMesa(sel); setSel(null); }}
                  className="w-full rounded-xl border border-dashed border-gray-300 py-2.5 text-sm font-semibold text-gray-500 hover:bg-gray-50">
                  + Nueva reserva en T{sel.numero}
                </button>
              </div>
            )}
          </div>
          );
        })()}
      </Modal>

      {/* ── Cancel confirm modal ─────────────────────────────────────────────── */}
      <Modal open={!!cancelReservaId} onClose={() => setCancelReservaId(null)}>
        {(() => {
          const cancelR = (sel?.agenda ?? []).find((a) => a.id === cancelReservaId) ?? sel?.reserva ?? null;
          const cancelBlock = !!cancelR && isTableBlockReservation(cancelR);
          return cancelReservaId && cancelR && (
          <div className="space-y-4">
            <h2 className="text-lg font-black text-gray-900">{cancelBlock ? "¿Desbloquear mesa?" : "¿Cancelar reserva?"}</h2>
            <p className="text-sm text-gray-600">
              <span className="font-semibold">{cancelBlock ? "Bloqueo mesa" : cancelR.nombre}</span> · {cancelR.hora} · {cancelBlock ? duracionBloqueoLabel(cancelR.duracionMin) : `${cancelR.personas} pax`}
            </p>
            <p className="text-sm text-gray-500">Esta acción no se puede deshacer.</p>
            <button onClick={() => handleCancelar(cancelR)}
              className={`w-full rounded-xl py-3 font-bold text-white ${cancelBlock ? "bg-rose-700 hover:bg-rose-600" : "bg-red-600 hover:bg-red-500"}`}>
              {cancelBlock ? "Sí, desbloquear" : "Sí, cancelar"}
            </button>
            <button onClick={() => setCancelReservaId(null)}
              className="w-full rounded-xl border border-gray-200 py-2.5 text-sm text-gray-600 hover:bg-gray-50">
              Volver
            </button>
          </div>
          );
        })()}
      </Modal>

      {/* ── Walk-In modal ────────────────────────────────────────────────────── */}
      <Modal open={!!wiMesa} onClose={closeWalkIn}>
        {wiMesa && (
          wiOk ? (
            <div className="space-y-4 text-center">
              <div className="rounded-xl bg-emerald-700 p-6 text-white">
                <p className="text-5xl font-black">{wiGeneral ? wiSelectedId : `T${wiMesa.numero}`}</p>
                <p className="mt-2 font-bold text-emerald-100">Mesa ocupada · Walk-In</p>
                <p className="text-sm text-emerald-100">{wiPersonas} personas</p>
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
                      return !mc || (mc.status === "available" && (mc.agenda?.length ?? 0) === 0);
                    }).map((m) => (
                      <button key={m.id} onClick={() => setWiSelectedId(m.id)}
                        className={`rounded-lg border-2 px-2 py-1.5 text-center transition-colors ${
                          wiSelectedId === m.id
                            ? "border-emerald-700 bg-emerald-100 text-emerald-900 font-bold"
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
                className="w-full rounded-xl bg-emerald-700 py-3.5 text-base font-black text-white hover:bg-emerald-600">
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
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Teléfono *</label>
            <input className={inp} type="tel" placeholder="+34…" value={nTelefono} onChange={(e) => setNTelefono(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Email</label>
            <input className={inp} type="email" placeholder="cliente@email.com" value={nEmail} onChange={(e) => setNEmail(e.target.value)} />
          </div>
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
            <TimeSlotPicker value={nHora} onChange={setNHora} servicio={nServicio} compact />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Servicio</label>
            <div className="flex overflow-hidden rounded-lg border border-gray-300">
              {(["comida", "cena"] as const).map((s) => (
                <button key={s} onClick={() => {
                  setNServicio(s);
                  setNHora((current) =>
                    slotsPlano(s).includes(current) ? current : defaultHoraPlano(fecha, s),
                  );
                }}
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

      {/* ── Bloquear mesa modal ─────────────────────────────────────────────── */}
      <Modal open={showBlock} onClose={() => setShowBlock(false)}>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-gray-900">Bloquear mesa</h2>
            <button onClick={() => setShowBlock(false)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
          </div>
          {bError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{bError}</p>}

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Fecha</label>
            <input type="date" className={inp} value={bFecha} onChange={(e) => setBFecha(e.target.value)} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Servicio</label>
            <div className="flex overflow-hidden rounded-lg border border-gray-300">
              {(["comida", "cena"] as const).map((s) => (
                <button key={s} onClick={() => {
                  setBServicio(s);
                  setBHora((current) =>
                    slotsPlano(s).includes(current) ? current : defaultHoraPlano(bFecha, s),
                  );
                }}
                  className={`flex-1 py-2 text-sm font-medium transition-colors ${
                    bServicio === s ? "bg-rose-700 text-white" : "bg-white text-gray-500"
                  }`}>
                  {s === "comida" ? "🍱 Comida" : "🍣 Cena"}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Hora</label>
            <TimeSlotPicker value={bHora} onChange={setBHora} servicio={bServicio} compact />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Duración</label>
            <select className={inp} value={bDuracion} onChange={(e) => setBDuracion(Number(e.target.value))}>
              <option value={30}>30 min</option>
              <option value={60}>1 hora</option>
              <option value={90}>1h 30</option>
              <option value={120}>2 horas</option>
              <option value={180}>3 horas</option>
              <option value={240}>4 horas</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Mesa(s)</label>
            <MesaPicker mesas={mesasList} selectedIds={bMesaIds} onToggle={toggleBMesa} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Motivo</label>
            <textarea className={inp} rows={2} value={bNotas} onChange={(e) => setBNotas(e.target.value)} placeholder="Ej. mesa rota, reservado interno, mantenimiento" />
          </div>
          <button onClick={submitBlock}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-rose-700 py-3 font-bold text-white hover:bg-rose-600">
            <Lock className="h-4 w-4" /> Bloquear mesa
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

      {/* ── Move table modal ─────────────────────────────────────────────────── */}
      <Modal open={!!moveReserva} onClose={() => setMoveReserva(null)}>
        {moveReserva && (() => {
          const disponibles = mesasDisponiblesParaCambio(moveReserva.id);
          const capacidad = moveMesaIds.reduce(
            (totalCapacidad, id) => totalCapacidad + (disponibles.find((m) => m.id === id)?.capacidad ?? 0),
            0,
          );
          return (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-black text-gray-900">Cambiar de mesa</h2>
                  <p className="text-sm text-gray-500">
                    {moveReserva.nombre} · {moveReserva.personas} personas
                  </p>
                  <p className="mt-1 text-xs font-semibold text-emerald-800">
                    Mesa actual: {mesaLabel(moveReserva.mesaIds)}
                  </p>
                </div>
                <button onClick={() => setMoveReserva(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {moveError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{moveError}</p>}

              {disponibles.length > 0 ? (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Mesas disponibles
                  </p>
                  <MesaPicker
                    mesas={disponibles}
                    selectedIds={moveMesaIds}
                    onToggle={(id) => setMoveMesaIds((prev) =>
                      prev.includes(id) ? prev.filter((mesaId) => mesaId !== id) : [...prev, id]
                    )}
                  />
                  <p className={`mt-2 text-xs font-semibold ${capacidad >= moveReserva.personas ? "text-emerald-700" : "text-gray-500"}`}>
                    Capacidad seleccionada: {capacidad} / {moveReserva.personas}
                  </p>
                </div>
              ) : (
                <p className="rounded-xl bg-gray-100 px-3 py-4 text-center text-sm text-gray-600">
                  No hay otra mesa disponible en este momento.
                </p>
              )}

              <button onClick={submitMove}
                disabled={!moveMesaIds.length || capacidad < moveReserva.personas}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 py-3 font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300">
                <ArrowRightLeft className="h-4 w-4" />
                Confirmar cambio
              </button>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
