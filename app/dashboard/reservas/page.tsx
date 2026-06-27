"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Search, AlertCircle, X, CheckCircle, RefreshCw, Printer, Clock, Mail } from "lucide-react";
import { ReservasNav } from "@/components/reservas/ReservasNav";
import { TimeSlotPicker } from "@/components/reservas/TimeSlotPicker";
import {
  canMoveReservation,
  countReservedTables,
  getReservationGuests,
  getReservationService,
  isActiveReservation,
} from "@/lib/reservas/helpers";
import { syncAndLoadReservas } from "@/lib/reservas/sync";
import { getSharedServicio, setSharedServicio } from "@/lib/reservas/shared-view";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  updateEstado,
  liberarMesa,
  sentarReserva,
  cambiarMesas,
  mesasDisponiblesParaCambio,
  desplazarReserva,
  getMesasConEstado,
  slotsPlano,
  defaultHoraPlano,
  mesaLabel,
  MESAS_SEED,
  MAX_DIAS,
  loadReservas,
  addEspera,
  loadEspera,
  updateEspera,
  getVisitasCliente,
  type MesaConEstado,
  type ReservaLocal,
  type EstadoLocal,
  type ServicioLocal,
  type MesaLocal,
  type EsperaLocal,
  type CanalLocal,
} from "@/lib/reservas/local-store";
import { Analytics } from "./Analytics";
import { MesCalendar } from "./MesCalendar";

// ─── Constants ────────────────────────────────────────────────────────────────

const ESTADO_STYLE: Record<EstadoLocal, { bg: string; text: string; label: string }> = {
  pendiente:  { bg: "bg-yellow-100",  text: "text-yellow-700",  label: "Pendiente"  },
  confirmada: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Confirmada" },
  llegada:    { bg: "bg-purple-100",  text: "text-purple-700",  label: "Llegada"    },
  sentada:    { bg: "bg-emerald-700", text: "text-white",       label: "En mesa"    },
  walkin:     { bg: "bg-emerald-700", text: "text-white",       label: "Walk-In"    },
  finished:   { bg: "bg-gray-100",    text: "text-gray-500",    label: "Finalizada" },
  "no-show":  { bg: "bg-gray-100",    text: "text-gray-500",    label: "No Show"    },
  cancelada:  { bg: "bg-gray-100",    text: "text-gray-400",    label: "Cancelada"  },
};

const CANAL_LABELS: Record<CanalLocal, string> = {
  google:     "🔍 Google",
  instagram:  "📸 Instagram",
  telefono:   "📞 Teléfono",
  web:        "🌐 Web",
  presencial: "🏠 Presencial",
  otro:       "Otro",
};

function hoy() { return new Date().toISOString().split("T")[0]; }
const FECHA_KEY = "karuma_shared_fecha";
function getSharedFecha() {
  if (typeof window === "undefined") return hoy();
  return localStorage.getItem(FECHA_KEY) || hoy();
}
function setSharedFecha(f: string) {
  if (typeof window !== "undefined") localStorage.setItem(FECHA_KEY, f);
}
function maxFecha() {
  const d = new Date(); d.setDate(d.getDate() + MAX_DIAS);
  return d.toISOString().split("T")[0];
}
function autoServicio(): ServicioLocal {
  const h = new Date().getHours();
  return h >= 17 ? "cena" : "comida";
}
function toMin(hora: string) { const [h, m] = hora.split(":").map(Number); return h * 60 + m; }

function canMoveLocalReservation(reserva: ReservaLocal): boolean {
  return canMoveReservation(reserva.estado) && reserva.mesaIds.length > 0;
}

function canRequestReview(reserva: ReservaLocal): boolean {
  return Boolean(
    reserva.email &&
    !reserva.reviewEmailSentAt &&
    (reserva.estado === "sentada" || reserva.estado === "walkin" || reserva.estado === "finished"),
  );
}

function getMealStats(reservas: ReservaLocal[], servicio: ServicioLocal) {
  const activas = reservas.filter(
    (r) => isActiveReservation(r.estado) && getReservationService(r) === servicio,
  );
  return {
    pax: activas.reduce((s, r) => s + getReservationGuests(r), 0),
    mesas: countReservedTables(activas),
    total: activas.length,
  };
}

// ─── Shared components ────────────────────────────────────────────────────────

function Modal({ open, title, onClose, children }: {
  open: boolean; title: string; onClose: () => void; children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-6 sm:rounded-2xl"
           onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}{required && <span className="ml-1 text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

const inp = "w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-karuma-500 focus:outline-none";

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
              sel ? "border-karuma-600 bg-karuma-50 text-karuma-700 font-bold"
                  : "border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-400"
            }`}>
            <p className="text-xs font-bold">T{m.numero}</p>
            <p className="text-[9px] text-gray-500">{m.capacidad}p</p>
          </button>
        );
      })}
    </div>
  );
}

// Formatea cuándo hizo el cliente la reserva (created_at): "19/06 · 22:32 · hace 3 días".
function infoCreado(creadoEn: string): { label: string; dias: number } | null {
  const d = new Date(creadoEn);
  if (Number.isNaN(d.getTime())) return null;
  const fecha = d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit" });
  const hora = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  const dias = Math.floor((Date.now() - d.getTime()) / 86400000);
  const rel = dias <= 0 ? "hoy" : dias === 1 ? "ayer" : `hace ${dias} días`;
  return { label: `${fecha} · ${hora} · ${rel}`, dias };
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReservasPage() {
  const [reservas, setReservas] = useState<ReservaLocal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [espera, setEspera] = useState<EsperaLocal[]>([]);
  const [mesas, setMesas] = useState<MesaConEstado[]>([]);

  // Mesa-panel inline state (walk-in desde el plano)
  const [mesaSel, setMesaSel] = useState<MesaConEstado | null>(null);
  const [wiInlineMesa, setWiInlineMesa] = useState<MesaConEstado | null>(null);
  const [wiInlinePersonas, setWiInlinePersonas] = useState(2);
  const [wiInlineNombre, setWiInlineNombre] = useState("");
  const [wiInlineError, setWiInlineError] = useState("");

  // ── Filters ────────────────────────────────────────────────────────────────
  const [fecha, setFecha] = useState(getSharedFecha);
  type VistaServicio = "" | ServicioLocal | "dia";
  const [vistaServicio, setVistaServicio] = useState<VistaServicio>(() => {
    const shared = getSharedServicio();
    if (shared) return shared;

    const h = new Date().getHours();
    if (h >= 12 && h < 17) return "comida";
    if (h >= 19) return "cena";
    return "dia";
  });
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoLocal | "">("");
  const [busqueda, setBusqueda] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [horaPanel, setHoraPanel] = useState(() => defaultHoraPlano(getSharedFecha(), "cena"));

  const [toast, setToast] = useState("");
  const [cancelId, setCancelId] = useState<string | null>(null);
  const [reviewSendingId, setReviewSendingId] = useState<string | null>(null);

  // ── Nueva Reserva ──────────────────────────────────────────────────────────
  const [showNueva, setShowNueva] = useState(false);
  const [nFecha, setNFecha] = useState(hoy);
  const [nHora, setNHora] = useState(() => defaultHoraPlano(hoy(), autoServicio()));
  const [nServicio, setNServicio] = useState<ServicioLocal>(autoServicio);
  const [nPersonas, setNPersonas] = useState(2);
  const [nNombre, setNNombre] = useState("");
  const [nTelefono, setNTelefono] = useState("");
  const [nEmail, setNEmail] = useState("");
  const [nNotas, setNNotas] = useState("");
  const [nMesaIds, setNMesaIds] = useState<string[]>([]);
  const [nCanal, setNCanal] = useState<CanalLocal>("telefono");
  const [nError, setNError] = useState("");
  const [nExito, setNExito] = useState<{ mesaIds: string[]; nombre: string; fecha: string; hora: string; personas: number } | null>(null);

  // ── Walk-In ────────────────────────────────────────────────────────────────
  const [showWI, setShowWI] = useState(false);
  const [wPersonas, setWPersonas] = useState(2);
  const [wNombre, setWNombre] = useState("");
  const [wTelefono, setWTelefono] = useState("");
  const [wNotas, setWNotas] = useState("");
  const [wMesaIds, setWMesaIds] = useState<string[]>([]);
  const [wCanal, setWCanal] = useState<CanalLocal>("presencial");
  const [wError, setWError] = useState("");
  const [wExito, setWExito] = useState<{ mesaIds: string[]; personas: number } | null>(null);

  // ── Lista de espera ────────────────────────────────────────────────────────
  const [showAddEspera, setShowAddEspera] = useState(false);
  const [eNombre, setENombre] = useState("");
  const [eTelefono, setETelefono] = useState("");
  const [ePersonas, setEPersonas] = useState(2);
  const [eNotas, setENotas] = useState("");
  const [eServicio, setEServicio] = useState<ServicioLocal>(autoServicio);

  // ── Vista ──────────────────────────────────────────────────────────────────
  type PanelVista = "dia" | "mes" | "analytics";
  const [panel, setPanel] = useState<PanelVista>("dia");

  // ── Desplazar ──────────────────────────────────────────────────────────────
  const [desplazarR, setDesplazarR] = useState<ReservaLocal | null>(null);
  const [despHora, setDespHora] = useState("");
  const [despFecha, setDespFecha] = useState("");
  const [despErr, setDespErr] = useState("");

  // ── Sentar / Cambiar mesa ──────────────────────────────────────────────────
  const [seatR, setSeatR] = useState<ReservaLocal | null>(null);
  const [seatIds, setSeatIds] = useState<string[]>([]);
  const [seatErr, setSeatErr] = useState("");
  const [changeR, setChangeR] = useState<ReservaLocal | null>(null);
  const [changeIds, setChangeIds] = useState<string[]>([]);
  const [changeErr, setChangeErr] = useState("");

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 3000); };
  const selectVistaServicio = (servicio: VistaServicio) => {
    setVistaServicio(servicio);
    if (servicio === "comida" || servicio === "cena") {
      setSharedServicio(servicio);
    }
  };

  // ── Load ───────────────────────────────────────────────────────────────────
  const servicioPlano: ServicioLocal = vistaServicio === "cena" ? "cena" : "comida";

  const reload = useCallback(() => {
    syncAndLoadReservas(fecha).then((all) => {
      setReservas(all);
      setEspera(loadEspera().filter((e) => e.fecha === fecha));
      setMesas(getMesasConEstado(fecha, servicioPlano, horaPanel));
      setLoaded(true);
    }).catch(() => {
      const all = loadReservas().filter((r) => r.fecha === fecha);
      setReservas(all);
      setEspera(loadEspera().filter((e) => e.fecha === fecha));
      setMesas(getMesasConEstado(fecha, servicioPlano, horaPanel));
      setLoaded(true);
    });
  }, [fecha, servicioPlano, horaPanel]);

  useEffect(() => { reload(); }, [reload]);

  // Visor del plano por hora en el panel lateral.
  useEffect(() => { setHoraPanel(defaultHoraPlano(fecha, servicioPlano)); }, [fecha, servicioPlano]);

  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb) return;
    const ch = sb.channel("reservas_admin_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservas" }, () => reload())
      .subscribe();
    return () => { void ch.unsubscribe(); };
  }, [reload]);

  // ── Derived stats per service ──────────────────────────────────────────────
  const statsComida = getMealStats(reservas, "comida");
  const statsCena = getMealStats(reservas, "cena");

  // ── Filters ────────────────────────────────────────────────────────────────
  const servicioFiltro: ServicioLocal | "" = vistaServicio === "dia" ? "" : vistaServicio;
  const filtradas = reservas.filter((r) => {
    if (servicioFiltro && r.servicio !== servicioFiltro) return false;
    if (estadoFiltro && r.estado !== estadoFiltro) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!r.nombre.toLowerCase().includes(q) && !r.telefono.includes(q)) return false;
    }
    if (horaInicio && toMin(r.hora) < toMin(horaInicio)) return false;
    if (horaFin   && toMin(r.hora) > toMin(horaFin))     return false;
    return true;
  }).sort((a, b) => a.hora.localeCompare(b.hora) || a.servicio.localeCompare(b.servicio));

  // ── Actions ────────────────────────────────────────────────────────────────
  async function handleSendReview(r: ReservaLocal) {
    if (!r.email) {
      showToast("Esta reserva no tiene email.");
      return;
    }

    setReviewSendingId(r.id);
    try {
      const response = await fetch("/api/reservas/enviar-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id }),
      });
      const json = await response.json() as { ok?: boolean; error?: string; alreadySent?: boolean; sentAt?: string };
      if (!response.ok || !json.ok) {
        showToast(json.error ?? "No se pudo enviar la solicitud.");
        return;
      }
      const sentAt = json.sentAt ?? new Date().toISOString();
      setReservas((current) =>
        current.map((item) => item.id === r.id ? { ...item, reviewEmailSentAt: sentAt } : item),
      );
      reload();
      showToast(json.alreadySent ? "La solicitud ya estaba enviada" : "Solicitud de reseña enviada");
    } catch {
      showToast("No se pudo enviar la solicitud.");
    } finally {
      setReviewSendingId(null);
    }
  }

  function handleEstado(r: ReservaLocal, estado: EstadoLocal) {
    updateEstado(r.id, estado);
    setCancelId(null);
    if (r.origen) {
      void fetch("/api/reservas/actualizar-estado", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, estado }),
      });
    }
    reload(); showToast("Estado actualizado");
  }

  function handleLiberar(r: ReservaLocal) {
    liberarMesa(r.id);
    if (r.origen) {
      void fetch("/api/reservas/actualizar-estado", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, estado: "finished" }),
      });
    }
    reload(); showToast("Mesa liberada");
  }

  function openSeat(r: ReservaLocal) { setSeatR(r); setSeatIds(r.mesaIds.length ? r.mesaIds : []); setSeatErr(""); }
  function submitSeat() {
    if (!seatR) return;
    const res = sentarReserva(seatR.id, seatIds.length ? seatIds : undefined);
    if (!res.ok) { setSeatErr(res.error); return; }
    if (seatR.origen) {
      void fetch("/api/reservas/actualizar-estado", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: seatR.id, estado: "sentada" }),
      });
    }
    setSeatR(null); reload(); showToast("Cliente sentado");
  }

  function openDesplazar(r: ReservaLocal) {
    setDesplazarR(r); setDespHora(r.hora); setDespFecha(r.fecha); setDespErr("");
  }
  function submitDesplazar() {
    if (!desplazarR || !despHora) return;
    const res = desplazarReserva(desplazarR.id, despHora, despFecha !== desplazarR.fecha ? despFecha : undefined);
    if (!res.ok) { setDespErr(res.error); return; }
    if (desplazarR.origen) {
      void fetch("/api/reservas/actualizar", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "editar",
          id: desplazarR.id,
          fecha: despFecha,
          hora: despHora,
        }),
      });
    }
    setDesplazarR(null); reload(); showToast("Reserva desplazada");
  }

  function openChange(r: ReservaLocal) { setChangeR(r); setChangeIds([]); setChangeErr(""); }
  function submitChange() {
    if (!changeR) return;
    if (!changeIds.length) { setChangeErr("Selecciona al menos una mesa."); return; }
    const res = cambiarMesas(changeR.id, changeIds);
    if (!res.ok) { setChangeErr(res.error); return; }
    if (changeR.origen) {
      void fetch("/api/reservas/actualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "cambiar-mesa",
          id: changeR.id,
          mesaIds: changeIds.map((id) => Number(id.replace("T", ""))),
        }),
      });
    }
    setChangeR(null); reload(); showToast("Mesa actualizada");
  }

  // ── Nueva Reserva ──────────────────────────────────────────────────────────
  async function submitNueva() {
    setNError("");
    if (!nFecha || !nHora) { setNError("Fecha y hora son obligatorias."); return; }
    if (nPersonas < 1)     { setNError("Indica el número de personas."); return; }
    if (!nTelefono.trim()) { setNError("El teléfono es obligatorio para sincronizar la reserva."); return; }

    try {
      const response = await fetch("/api/reservas/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: nFecha,
          hora: nHora,
          servicio: nServicio,
          personas: nPersonas,
          nombre: nNombre || "Sin nombre",
          telefono: nTelefono.trim(),
          email: nEmail.trim() || undefined,
          notas: nNotas,
          origen: "manual",
          forceMesaIds: nMesaIds.length ? nMesaIds.map((id) => Number(id.replace("T", ""))) : undefined,
        }),
      });
      const json = await response.json() as { ok?: boolean; error?: string; mesaIds?: number[] };
      if (!response.ok || !json.ok) {
        setNError(json.error ?? "No se pudo crear la reserva.");
        return;
      }
      const mesaIds = (json.mesaIds ?? []).map((id) => `T${id}`);
      setNExito({ mesaIds, nombre: nNombre || "Sin nombre", fecha: nFecha, hora: nHora, personas: nPersonas });
      reload();
    } catch {
      setNError("No se pudo crear la reserva.");
    }
  }
  function cerrarNueva() {
    setShowNueva(false); setNError(""); setNExito(null);
    setNNombre(""); setNTelefono(""); setNEmail(""); setNNotas(""); setNMesaIds([]);
    const servicio = autoServicio();
    const fechaInicial = hoy();
    setNFecha(fechaInicial); setNHora(defaultHoraPlano(fechaInicial, servicio)); setNServicio(servicio); setNPersonas(2); setNCanal("telefono");
  }

  // ── Walk-In ────────────────────────────────────────────────────────────────
  async function submitWI() {
    setWError("");
    if (wPersonas < 1) { setWError("Indica el número de personas."); return; }
    try {
      const response = await fetch("/api/reservas/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: hoy(),
          hora: new Date().toTimeString().slice(0, 5),
          servicio: autoServicio(),
          personas: wPersonas,
          nombre: wNombre || "Walk-In",
          telefono: wTelefono.trim(),
          notas: wNotas,
          origen: "walkin",
          forceMesaIds: wMesaIds.length ? wMesaIds.map((id) => Number(id.replace("T", ""))) : undefined,
        }),
      });
      const json = await response.json() as { ok?: boolean; error?: string; mesaIds?: number[] };
      if (!response.ok || !json.ok) {
        setWError(json.error ?? "No se pudo registrar el Walk-In.");
        return;
      }
      setWExito({ mesaIds: (json.mesaIds ?? []).map((id) => `T${id}`), personas: wPersonas });
      reload();
    } catch {
      setWError("No se pudo registrar el Walk-In.");
    }
  }
  function cerrarWI() {
    setShowWI(false); setWError(""); setWExito(null);
    setWNombre(""); setWTelefono(""); setWNotas(""); setWPersonas(2); setWMesaIds([]); setWCanal("presencial");
  }

  // ── Lista de espera ────────────────────────────────────────────────────────
  function submitEspera() {
    if (!eNombre.trim()) return;
    addEspera(fecha, eServicio, eNombre, eTelefono, ePersonas, eNotas);
    setShowAddEspera(false); setENombre(""); setETelefono(""); setEPersonas(2); setENotas("");
    reload(); showToast("Añadido a lista de espera");
  }
  function handleEsperaEstado(id: string, estado: EsperaLocal["estado"]) {
    updateEspera(id, estado); reload();
  }

  async function submitInlineWalkIn() {
    if (!wiInlineMesa) return;
    setWiInlineError("");
    try {
      const response = await fetch("/api/reservas/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fecha: hoy(),
          hora: new Date().toTimeString().slice(0, 5),
          servicio: autoServicio(),
          personas: wiInlinePersonas,
          nombre: wiInlineNombre || "Walk-In",
          telefono: "",
          notas: "",
          origen: "walkin",
          forceMesaIds: [Number(wiInlineMesa.id.replace("T", ""))],
        }),
      });
      const json = await response.json() as { ok?: boolean; error?: string };
      if (!response.ok || !json.ok) {
        setWiInlineError(json.error ?? "No se pudo registrar el Walk-In.");
        return;
      }
      const mesaNumero = wiInlineMesa.numero;
      setWiInlineMesa(null);
      setMesaSel(null);
      reload();
      showToast(`T${mesaNumero} — Walk-In registrado`);
    } catch {
      setWiInlineError("No se pudo registrar el Walk-In.");
    }
  }

  const esperaActiva = espera.filter((e) => e.estado === "esperando");

  // ── Print ──────────────────────────────────────────────────────────────────
  function handlePrint() { window.print(); }

  return (
    <div className="-m-3 min-h-dvh bg-white p-4 text-gray-900 sm:-m-4 md:-m-6 md:p-6">
      <style>{`
        @media print {
          nav, button, .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; color: black; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="mx-auto max-w-5xl">
        <ReservasNav />

        {/* ── Panel tabs ──────────────────────────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between no-print">
          <div className="flex overflow-hidden rounded-lg border border-gray-300 text-sm">
            {([["dia","📋 Día"],["mes","📅 Mes"],["analytics","📊 Analytics"]] as [PanelVista,string][]).map(([v,l]) => (
              <button key={v} onClick={() => setPanel(v)}
                className={`px-4 py-2 font-medium transition-colors ${panel === v ? "bg-karuma-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-500 hover:bg-gray-50">
              <Printer className="h-4 w-4" />
            </button>
            <button onClick={() => { setENombre(""); setETelefono(""); setEPersonas(2); setENotas(""); setShowAddEspera(true); }}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-sm font-bold transition-colors ${
                esperaActiva.length > 0
                  ? "border-amber-400 bg-amber-50 text-amber-700"
                  : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
              }`}>
              <Clock className="h-4 w-4" />
              {esperaActiva.length > 0 ? `Espera (${esperaActiva.length})` : "Lista de espera"}
            </button>
            <button onClick={() => setShowWI(true)}
              className="rounded-xl bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-600">
              Walk-In
            </button>
            <button onClick={() => setShowNueva(true)}
              className="flex items-center gap-1.5 rounded-xl bg-karuma-600 px-4 py-2 text-sm font-bold text-white hover:bg-karuma-700">
              <Plus className="h-4 w-4" /> Nueva
            </button>
          </div>
        </div>

        {/* ── Panel Mes ───────────────────────────────────────────────────── */}
        {panel === "mes" && (
          <MesCalendar
            reservas={reservas.concat(
              // load all reservas for current month
              (() => { try { return JSON.parse(localStorage.getItem("karuma_reservas_v1") ?? "[]") as ReservaLocal[]; } catch { return []; } })()
                .filter((r) => !reservas.find((x) => x.id === r.id))
            )}
            fechaSeleccionada={fecha}
            onSelectFecha={(f) => { setFecha(f); setSharedFecha(f); setPanel("dia"); }}
          />
        )}

        {/* ── Panel Analytics ─────────────────────────────────────────────── */}
        {panel === "analytics" && <Analytics />}

        {panel !== "dia" && null}
        {panel === "dia" && (<>

        {/* ── Stats doble (como CoverManager) ─────────────────────────────── */}
        <div className="mb-4 grid grid-cols-2 gap-3">
          {[
            { label: "Comida", icon: "🍱", stats: statsComida, color: "amber" },
            { label: "Cena",   icon: "🍣", stats: statsCena,   color: "indigo" },
          ].map(({ label, icon, stats: s, color }) => (
            <div key={label} className={`rounded-xl border p-3 ${
              color === "amber" ? "border-amber-200 bg-amber-50" : "border-indigo-200 bg-indigo-50"
            }`}>
              <div className="flex items-center justify-between">
                <span className={`text-sm font-bold ${color === "amber" ? "text-amber-700" : "text-indigo-700"}`}>
                  {icon} {label}
                </span>
                <span className={`text-xs ${color === "amber" ? "text-amber-500" : "text-indigo-500"}`}>
                  {s.total} reservas
                </span>
              </div>
              <div className="mt-1.5 flex gap-4">
                <div>
                  <p className={`text-2xl font-black ${color === "amber" ? "text-amber-800" : "text-indigo-800"}`}>
                    {s.pax}
                  </p>
                  <p className="text-[10px] text-gray-500">pax</p>
                </div>
                <div>
                  <p className={`text-2xl font-black ${color === "amber" ? "text-amber-800" : "text-indigo-800"}`}>
                    {s.mesas}
                  </p>
                  <p className="text-[10px] text-gray-500">mesas reservadas</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Filters ─────────────────────────────────────────────────────── */}
        <div className="mb-3 flex flex-wrap gap-2 no-print">
          <input type="date" value={fecha} min={hoy()} max={maxFecha()}
            onChange={(e) => { setFecha(e.target.value); setSharedFecha(e.target.value); }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900" />

          {/* Vista servicio: Comida | Cena | Día completo */}
          <div className="flex overflow-hidden rounded-lg border border-gray-300 text-sm">
            {([ ["comida","🍱 Comida"],["cena","🍣 Cena"],["dia","Día completo"] ] as [VistaServicio, string][]).map(([val, lbl]) => (
              <button key={val} onClick={() => selectVistaServicio(val)}
                className={`px-3 py-2 font-medium transition-colors ${
                  vistaServicio === val ? "bg-karuma-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                }`}>
                {lbl}
              </button>
            ))}
          </div>

          {/* Búsqueda */}
          <div className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input placeholder="Buscar…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              className="w-24 bg-transparent text-sm text-gray-900 focus:outline-none" />
          </div>

          {/* Filtro hora inicio */}
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600">
            <span className="text-xs text-gray-400">H. inicio</span>
            <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)}
              className="w-20 bg-transparent text-sm text-gray-900 focus:outline-none" />
          </div>

          {/* Filtro hora fin */}
          <div className="flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600">
            <span className="text-xs text-gray-400">H. fin</span>
            <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)}
              className="w-20 bg-transparent text-sm text-gray-900 focus:outline-none" />
          </div>

          <button onClick={() => reload()} className="rounded-lg border border-gray-300 bg-white p-2 text-gray-400 hover:bg-gray-50">
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* ── Estado chips ─────────────────────────────────────────────────── */}
        <div className="mb-4 flex flex-wrap gap-2 no-print">
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
            const filtered = val ? reservas.filter((r) => r.estado === val && (!servicioFiltro || r.servicio === servicioFiltro)) : null;
            return (
              <button key={val} onClick={() => setEstadoFiltro(val)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  estadoFiltro === val ? "bg-karuma-600 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}>
                {label}{filtered !== null && <span className="ml-1 opacity-70">{filtered.length}</span>}
              </button>
            );
          })}
        </div>

        {/* ── Print header ────────────────────────────────────────────────── */}
        <div className="print-only mb-4">
          <h1 className="text-xl font-bold">Reservas — {fecha}</h1>
          <p className="text-sm text-gray-500">
            Comida: {statsComida.mesas} mesas · {statsComida.pax} pax &nbsp;|&nbsp; Cena: {statsCena.mesas} mesas · {statsCena.pax} pax
          </p>
        </div>

        {/* ── Split: Lista + Plano ─────────────────────────────────────────── */}
        <div className="flex gap-4">
        {/* ── List (izq) ──────────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1">
        {!loaded ? (
          <p className="py-12 text-center text-gray-500">Cargando…</p>
        ) : filtradas.length === 0 ? (
          <div className="py-16 text-center no-print">
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
              const isAct = isActiveReservation(r.estado);
              const canMove = canMoveLocalReservation(r);
              const canReview = canRequestReview(r);
              const reviewSent = Boolean(r.reviewEmailSentAt);
              const showActions = isAct || canReview || reviewSent;
              const visitas = getVisitasCliente(r.telefono);
              return (
                <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold">{r.hora}</span>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${st.bg} ${st.text}`}>{st.label}</span>
                        {vistaServicio === "dia" && (
                          <span className="text-xs text-gray-400 capitalize">{r.servicio}</span>
                        )}
                        {r.origen === "online" && (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-600">🌐 Online</span>
                        )}
                        {r.canal && r.canal !== "presencial" && r.canal !== "otro" && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">{CANAL_LABELS[r.canal]}</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <p className="font-semibold text-gray-900">{r.nombre}</p>
                        {visitas > 1 && (
                          <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-black text-white" title={`${visitas} visitas`}>
                            {visitas}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-400">
                        {r.telefono && <span className="mr-3">{r.telefono}</span>}
                        <span>{r.personas} pax</span>
                        {mesa !== "—" && <span className="ml-3 font-semibold text-karuma-600">{mesa}</span>}
                      </p>
                      {(() => {
                        const c = infoCreado(r.creadoEn);
                        return c ? (
                          <p className={`mt-0.5 text-[10px] ${c.dias >= 3 ? "font-semibold text-amber-600" : "text-gray-400"}`}>
                            Reservado: {c.label}
                          </p>
                        ) : null;
                      })()}
                      {r.notas && <p className="mt-1 text-xs italic text-gray-500">{r.notas}</p>}
                      {r.seatedAt && (
                        <p className="mt-0.5 text-[10px] text-gray-400">
                          Entrada: {new Date(r.seatedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}
                          {r.finishedAt && ` · Salida: ${new Date(r.finishedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}`}
                        </p>
                      )}
                    </div>

                    {showActions && (
                      <div className="flex flex-wrap gap-1.5 no-print">
                        {isAct && (
                          <>
                            {r.estado === "pendiente" && (
                              <button onClick={() => handleEstado(r, "confirmada")}
                                className="rounded-lg bg-emerald-800 px-2.5 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-700">
                                Confirmar
                              </button>
                            )}
                            {(r.estado === "confirmada" || r.estado === "pendiente") && (
                              <button onClick={() => handleEstado(r, "llegada")}
                                className="rounded-lg bg-purple-700 px-2.5 py-1 text-xs font-semibold text-purple-200 hover:bg-purple-600">
                                Llegada
                              </button>
                            )}
                            {(r.estado === "confirmada" || r.estado === "pendiente" || r.estado === "llegada") && (
                              <button onClick={() => openSeat(r)}
                                className="rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-600">
                                Sentar
                              </button>
                            )}
                            {(r.estado === "sentada" || r.estado === "walkin") && (
                              <button onClick={() => handleLiberar(r)}
                                className="rounded-lg bg-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-300">
                                Liberar
                              </button>
                            )}
                            <button onClick={() => openDesplazar(r)}
                              className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-200">
                              Desplazar
                            </button>
                            {canMove && (
                              <button onClick={() => openChange(r)}
                                className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-200">
                                Cambiar mesa
                              </button>
                            )}
                            {r.estado !== "no-show" && (
                              <button onClick={() => handleEstado(r, "no-show")}
                                className="rounded-lg bg-yellow-900 px-2.5 py-1 text-xs font-semibold text-yellow-300 hover:bg-yellow-800">
                                No Show
                              </button>
                            )}
                            {cancelId === r.id ? (
                              <>
                                <button onClick={() => handleEstado(r, "cancelada")}
                                  className="rounded-lg bg-red-700 px-2.5 py-1 text-xs font-bold text-white">¿Seguro?</button>
                                <button onClick={() => setCancelId(null)}
                                  className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs text-gray-600">No</button>
                              </>
                            ) : (
                              <button onClick={() => setCancelId(r.id)}
                                className="rounded-lg bg-gray-100 px-2.5 py-1 text-xs text-gray-500 hover:bg-gray-200">
                                Cancelar
                              </button>
                            )}
                          </>
                        )}
                        {canReview && (
                          <button
                            onClick={() => void handleSendReview(r)}
                            disabled={reviewSendingId === r.id}
                            className="inline-flex items-center gap-1 rounded-lg bg-karuma-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-karuma-700 disabled:cursor-wait disabled:bg-gray-300"
                          >
                            <Mail className="h-3.5 w-3.5" />
                            {reviewSendingId === r.id ? "Enviando" : "Pedir reseña"}
                          </button>
                        )}
                        {!canReview && reviewSent && (
                          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            Reseña enviada
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>{/* end list */}

        {/* ── Plano (der) ─────────────────────────────────────────────────── */}
        <div className="hidden w-72 shrink-0 xl:block">
          <div className="sticky top-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400">Plano · {servicioPlano}</p>
              <div className="flex overflow-hidden rounded-lg border border-gray-200 text-xs">
                {(["comida","cena"] as ServicioLocal[]).map((s) => (
                  <button key={s} onClick={() => selectVistaServicio(s)}
                    className={`px-2 py-1 font-medium ${servicioPlano === s ? "bg-karuma-600 text-white" : "bg-white text-gray-400"}`}>
                    {s === "comida" ? "🍱" : "🍣"}
                  </button>
                ))}
              </div>
            </div>
            {/* Selector de hora */}
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wide text-gray-400">A las</span>
              <select value={horaPanel} onChange={(e) => setHoraPanel(e.target.value)}
                className="flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-bold text-karuma-600">
                {slotsPlano(servicioPlano).map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {mesas.map((m) => {
                const colors = {
                  available: "border-gray-200 bg-white text-gray-400",
                  reserved:  "border-emerald-300 bg-emerald-100 text-emerald-900",
                  occupied:  "border-emerald-800 bg-emerald-700 text-white",
                  cleaning:  "border-gray-300 bg-gray-100 text-gray-600",
                };
                const nTurnos = m.agenda?.length ?? 0;
                const visualStatus = m.status === "available" && nTurnos > 0 ? "reserved" : m.status;
                return (
                  <button key={m.id} onClick={() => setMesaSel(m)}
                    className={`relative rounded-lg border-2 p-1.5 text-center transition-all active:scale-95 ${colors[visualStatus]}`}>
                    {nTurnos > 1 && (
                      <span className="absolute left-0.5 top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-gray-900 px-0.5 text-[8px] font-bold text-white"
                        title={`${nTurnos} reservas hoy`}>{nTurnos}</span>
                    )}
                    <p className="text-xs font-black">T{m.numero}</p>
                    <p className="text-[9px] opacity-70">{m.capacidad}p</p>
                    {m.reserva
                      ? <p className="truncate text-[8px] font-semibold leading-tight">{m.reserva.nombre.split(" ")[0]}</p>
                      : nTurnos > 0 && <p className="truncate text-[8px] font-semibold leading-tight text-emerald-700">{m.agenda![0].hora}</p>}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex gap-2 text-[10px] text-gray-400">
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm border border-gray-300 bg-white"/>&nbsp;Libre</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-200"/>&nbsp;Reservada</span>
              <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-700"/>&nbsp;Ocupada</span>
            </div>
          </div>
        </div>
        </div>{/* end split */}

        </>)}
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* ── Mesa-plano detail modal ───────────────────────────────────────────── */}
      <Modal open={!!mesaSel && !wiInlineMesa} title={`Mesa T${mesaSel?.numero}`} onClose={() => setMesaSel(null)}>
        {mesaSel && (
          <div className="space-y-3">
            <p className="text-sm text-gray-500">
              {mesaSel.capacidad} pax · {
                mesaSel.status === "occupied"
                  ? "Ocupada"
                  : mesaSel.status === "reserved" || (mesaSel.agenda?.length ?? 0) > 0
                    ? "Reservada"
                    : "Libre"
              }
            </p>
            {mesaSel.reserva && (
              <div className={`rounded-xl p-3 text-sm space-y-1 ${mesaSel.status === "occupied" ? "bg-emerald-700 text-white" : "bg-emerald-100"}`}>
                <div className="flex justify-between"><span className={mesaSel.status === "occupied" ? "text-emerald-100" : "text-gray-500"}>Cliente</span><span className="font-semibold">{mesaSel.reserva.nombre}</span></div>
                <div className="flex justify-between"><span className={mesaSel.status === "occupied" ? "text-emerald-100" : "text-gray-500"}>Hora</span><span>{mesaSel.reserva.hora}</span></div>
                <div className="flex justify-between"><span className={mesaSel.status === "occupied" ? "text-emerald-100" : "text-gray-500"}>Personas</span><span>{mesaSel.reserva.personas}</span></div>
              </div>
            )}
            {/* Agenda del día: varios turnos */}
            {((mesaSel.agenda?.length ?? 0) > 1 || (!mesaSel.reserva && (mesaSel.agenda?.length ?? 0) > 0)) && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">Reservas del día · {mesaSel.agenda!.length} turnos</p>
                <div className="space-y-1.5">
                  {mesaSel.agenda!.map((a) => (
                    <div key={a.id} className={`flex items-center justify-between rounded-lg bg-white px-2.5 py-1.5 text-sm ${a.id === mesaSel.reserva?.id ? "ring-2 ring-karuma-400" : "border border-gray-100"}`}>
                      <div className="flex min-w-0 items-center gap-2"><span className="font-black text-gray-900">{a.hora}</span><span className="truncate text-gray-600">{a.nombre}</span></div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className="text-xs text-gray-400">{a.personas}p</span>
                        {canMoveLocalReservation(a) && (
                          <button
                            onClick={() => { openChange(a); setMesaSel(null); }}
                            className="rounded-lg bg-gray-100 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-200"
                          >
                            Cambiar mesa
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {mesaSel.status === "available" && (mesaSel.agenda?.length ?? 0) === 0 && (
              <button onClick={() => { setWiInlineMesa(mesaSel); setWiInlinePersonas(mesaSel.capacidad); setWiInlineNombre(""); setWiInlineError(""); }}
                className="w-full rounded-xl bg-emerald-700 py-3 font-bold text-white hover:bg-emerald-600">
                + Walk-In directo
              </button>
            )}
            {mesaSel.status === "reserved" && mesaSel.reserva && (
              <>
                <button onClick={() => { openSeat(mesaSel.reserva!); setMesaSel(null); }}
                  className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white hover:bg-karuma-700">
                  → Sentar
                </button>
                {canMoveLocalReservation(mesaSel.reserva) && (
                  <button onClick={() => { openChange(mesaSel.reserva!); setMesaSel(null); }}
                    className="w-full rounded-xl border border-emerald-300 bg-emerald-50 py-2.5 font-bold text-emerald-800 hover:bg-emerald-100">
                    ⇄ Cambiar mesa
                  </button>
                )}
              </>
            )}
            {mesaSel.status === "occupied" && mesaSel.reserva && (
              <>
                <button onClick={() => { handleLiberar(mesaSel.reserva!); setMesaSel(null); }}
                  className="w-full rounded-xl bg-gray-800 py-3 font-bold text-white hover:bg-gray-700">
                  ✓ Liberar mesa
                </button>
                {canMoveLocalReservation(mesaSel.reserva) && (
                  <button onClick={() => { openChange(mesaSel.reserva!); setMesaSel(null); }}
                    className="w-full rounded-xl border border-emerald-300 bg-emerald-50 py-2.5 font-bold text-emerald-800 hover:bg-emerald-100">
                    ⇄ Cambiar mesa
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Walk-in desde plano */}
      <Modal open={!!wiInlineMesa} title={`Walk-In — T${wiInlineMesa?.numero}`} onClose={() => setWiInlineMesa(null)}>
        {wiInlineMesa && (
          <div className="space-y-4">
            {wiInlineError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{wiInlineError}</p>}
            <Field label="Personas" required>
              <div className="flex items-center gap-3">
                <button onClick={() => setWiInlinePersonas(Math.max(1, wiInlinePersonas - 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl font-bold">−</button>
                <span className="flex-1 text-center text-4xl font-black">{wiInlinePersonas}</span>
                <button onClick={() => setWiInlinePersonas(wiInlinePersonas + 1)}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl font-bold">+</button>
              </div>
            </Field>
            <Field label="Nombre (opcional)">
              <input className={inp} value={wiInlineNombre} onChange={(e) => setWiInlineNombre(e.target.value)} placeholder="Walk-In" />
            </Field>
            <button onClick={() => void submitInlineWalkIn()} className="w-full rounded-xl bg-emerald-700 py-3.5 font-black text-white hover:bg-emerald-600">
              Ocupar T{wiInlineMesa.numero} ahora
            </button>
          </div>
        )}
      </Modal>

      {/* ── Desplazar modal ───────────────────────────────────────────────────── */}
      <Modal open={!!desplazarR} title="Desplazar reserva" onClose={() => setDesplazarR(null)}>
        {desplazarR && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{desplazarR.nombre} · {desplazarR.hora} · {desplazarR.personas} pax</p>
            {despErr && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{despErr}</p>}
            <Field label="Nueva fecha">
              <input type="date" value={despFecha} min={hoy()} max={maxFecha()}
                onChange={(e) => setDespFecha(e.target.value)} className={inp} />
            </Field>
            <Field label="Nueva hora">
              <TimeSlotPicker
                value={despHora}
                onChange={setDespHora}
                servicio={desplazarR.servicio}
                compact
              />
            </Field>
            <button onClick={submitDesplazar}
              className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white hover:bg-karuma-700">
              Confirmar desplazamiento
            </button>
          </div>
        )}
      </Modal>

      {/* ── Nueva Reserva ─────────────────────────────────────────────────────── */}
      <Modal open={showNueva} title="Nueva Reserva" onClose={cerrarNueva}>
        {nExito ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <CheckCircle className="h-6 w-6 shrink-0 text-emerald-600" />
              <div>
                <p className="font-bold text-emerald-700">Reserva confirmada</p>
                <p className="text-sm text-emerald-600">{mesaLabel(nExito.mesaIds)} asignada</p>
              </div>
            </div>
            <div className="space-y-1.5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Nombre</span><span className="font-semibold">{nExito.nombre}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Fecha</span><span className="font-semibold">{nExito.fecha} · {nExito.hora}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Personas</span><span className="font-semibold">{nExito.personas}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Mesa</span><span className="font-bold text-karuma-600">{mesaLabel(nExito.mesaIds)}</span></div>
            </div>
            <button onClick={cerrarNueva} className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white hover:bg-karuma-700">Cerrar</button>
          </div>
        ) : (
          <div className="space-y-4">
            {nError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" /> {nError}
              </div>
            )}
            <Field label="Fecha" required>
              <input
                type="date"
                value={nFecha}
                min={hoy()}
                max={maxFecha()}
                onChange={(e) => {
                  const nextFecha = e.target.value;
                  setNFecha(nextFecha);
                  setNHora((current) =>
                    slotsPlano(nServicio).includes(current)
                      ? current
                      : defaultHoraPlano(nextFecha, nServicio),
                  );
                }}
                className={inp}
              />
            </Field>
            <Field label="Hora" required>
              <TimeSlotPicker value={nHora} onChange={setNHora} servicio={nServicio} compact />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Servicio" required>
                <select
                  value={nServicio}
                  onChange={(e) => {
                    const nextServicio = e.target.value as ServicioLocal;
                    setNServicio(nextServicio);
                    setNHora((current) =>
                      slotsPlano(nextServicio).includes(current)
                        ? current
                        : defaultHoraPlano(nFecha, nextServicio),
                    );
                  }}
                  className={inp}
                >
                  <option value="comida">🍱 Comida</option>
                  <option value="cena">🍣 Cena</option>
                </select>
              </Field>
              <Field label="Personas" required>
                <input type="number" min={1} max={20} value={nPersonas} onChange={(e) => setNPersonas(Number(e.target.value))} className={inp} />
              </Field>
            </div>
            <Field label="Nombre del cliente">
              <input placeholder="Ej. Ana García" value={nNombre} onChange={(e) => setNNombre(e.target.value)} className={inp} />
            </Field>
            <Field label="Teléfono" required>
              <input type="tel" placeholder="+34 6XX XXX XXX" value={nTelefono} onChange={(e) => setNTelefono(e.target.value)} className={inp} />
            </Field>
            <Field label="Email">
              <input type="email" placeholder="cliente@email.com" value={nEmail} onChange={(e) => setNEmail(e.target.value)} className={inp} />
            </Field>
            <Field label="Canal de captación">
              <select value={nCanal} onChange={(e) => setNCanal(e.target.value as CanalLocal)} className={inp}>
                {(Object.entries(CANAL_LABELS) as [CanalLocal, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Notas">
              <textarea rows={2} value={nNotas} onChange={(e) => setNNotas(e.target.value)} className={inp} placeholder="Alergias, celebraciones…" />
            </Field>
            <Field label="Mesa manual (opcional — auto si vacío)">
              <MesaPicker mesas={MESAS_SEED} selected={nMesaIds}
                onToggle={(id) => setNMesaIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])} />
            </Field>
            <button onClick={() => submitNueva()}
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
            <div className="flex items-center gap-3 rounded-xl border border-emerald-300 bg-emerald-100 p-4">
              <CheckCircle className="h-6 w-6 shrink-0 text-emerald-700" />
              <div>
                <p className="font-bold text-emerald-900">Walk-In registrado</p>
                <p className="text-sm text-emerald-700">Mesa: {mesaLabel(wExito.mesaIds)}</p>
              </div>
            </div>
            <div className="rounded-xl bg-emerald-700 p-4 text-center text-white">
              <p className="text-4xl font-black">{mesaLabel(wExito.mesaIds)}</p>
              <p className="text-sm text-emerald-100">{wExito.personas} personas</p>
            </div>
            <button onClick={cerrarWI} className="w-full rounded-xl bg-emerald-700 py-3 font-bold text-white hover:bg-emerald-600">Cerrar</button>
          </div>
        ) : (
          <div className="space-y-4">
            {wError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" /> {wError}
              </div>
            )}
            <Field label="Personas" required>
              <div className="flex items-center gap-3">
                <button onClick={() => setWPersonas(Math.max(1, wPersonas - 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl font-bold text-gray-700 hover:bg-gray-200">−</button>
                <span className="flex-1 text-center text-4xl font-black">{wPersonas}</span>
                <button onClick={() => setWPersonas(Math.min(20, wPersonas + 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl font-bold text-gray-700 hover:bg-gray-200">+</button>
              </div>
            </Field>
            <Field label="Nombre (opcional)">
              <input value={wNombre} onChange={(e) => setWNombre(e.target.value)} className={inp} placeholder="Walk-In" />
            </Field>
            <Field label="Teléfono (opcional)">
              <input type="tel" value={wTelefono} onChange={(e) => setWTelefono(e.target.value)} className={inp} placeholder="+34…" />
            </Field>
            <Field label="Canal de captación">
              <select value={wCanal} onChange={(e) => setWCanal(e.target.value as CanalLocal)} className={inp}>
                {(Object.entries(CANAL_LABELS) as [CanalLocal, string][]).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </Field>
            <Field label="Notas">
              <textarea rows={2} value={wNotas} onChange={(e) => setWNotas(e.target.value)} className={inp} />
            </Field>
            <Field label="Mesa (opcional — auto si vacío)">
              <MesaPicker mesas={MESAS_SEED} selected={wMesaIds}
                onToggle={(id) => setWMesaIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])} />
            </Field>
            <button onClick={() => submitWI()}
              className="w-full rounded-xl bg-emerald-700 py-3.5 text-base font-black text-white hover:bg-emerald-600">
              Asignar mesa ahora
            </button>
          </div>
        )}
      </Modal>

      {/* ── Lista de espera ───────────────────────────────────────────────────── */}
      <Modal open={showAddEspera} title="Añadir a lista de espera" onClose={() => setShowAddEspera(false)}>
        <div className="space-y-4">
          {esperaActiva.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="mb-2 text-xs font-bold text-amber-700">EN ESPERA AHORA</p>
              {esperaActiva.map((e) => (
                <div key={e.id} className="mb-2 flex items-center justify-between rounded-lg bg-white p-2.5 text-sm shadow-sm">
                  <div>
                    <p className="font-semibold">{e.nombre}</p>
                    <p className="text-xs text-gray-400">{e.personas} pax · {e.servicio} · {e.notas}</p>
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleEsperaEstado(e.id, "sentado")}
                      className="rounded-lg bg-emerald-600 px-2 py-1 text-xs font-bold text-white">Sentar</button>
                    <button onClick={() => handleEsperaEstado(e.id, "cancelado")}
                      className="rounded-lg bg-gray-200 px-2 py-1 text-xs text-gray-600">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre" required>
              <input value={eNombre} onChange={(e) => setENombre(e.target.value)} className={inp} placeholder="Cliente" />
            </Field>
            <Field label="Teléfono">
              <input type="tel" value={eTelefono} onChange={(e) => setETelefono(e.target.value)} className={inp} placeholder="+34…" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Personas">
              <input type="number" min={1} max={20} value={ePersonas} onChange={(e) => setEPersonas(Number(e.target.value))} className={inp} />
            </Field>
            <Field label="Servicio">
              <select value={eServicio} onChange={(e) => setEServicio(e.target.value as ServicioLocal)} className={inp}>
                <option value="comida">🍱 Comida</option>
                <option value="cena">🍣 Cena</option>
              </select>
            </Field>
          </div>
          <Field label="Notas">
            <input value={eNotas} onChange={(e) => setENotas(e.target.value)} className={inp} placeholder="Alergias, preferencias…" />
          </Field>
          <button onClick={submitEspera}
            className="w-full rounded-xl bg-amber-500 py-3 font-bold text-white hover:bg-amber-400">
            Añadir a lista de espera
          </button>
        </div>
      </Modal>

      {/* ── Sentar modal ──────────────────────────────────────────────────────── */}
      <Modal open={!!seatR} title="Sentar cliente" onClose={() => setSeatR(null)}>
        {seatR && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{seatR.nombre} · {seatR.personas} personas · {seatR.hora}</p>
            {seatErr && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{seatErr}</p>}
            <div>
              <p className="mb-2 text-xs text-gray-500">Selecciona mesa(s) o deja vacío para auto-asignar:</p>
              <MesaPicker mesas={MESAS_SEED} selected={seatIds}
                onToggle={(id) => setSeatIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])} />
            </div>
            <button onClick={() => submitSeat()}
              className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white hover:bg-karuma-700">
              {seatIds.length ? `Sentar en ${seatIds.join(", ")}` : "Sentar (auto)"}
            </button>
          </div>
        )}
      </Modal>

      {/* ── Cambiar mesa modal ────────────────────────────────────────────────── */}
      <Modal open={!!changeR} title="Cambiar mesa" onClose={() => setChangeR(null)}>
        {changeR && (() => {
          const disponibles = mesasDisponiblesParaCambio(changeR.id);
          const capacidad = changeIds.reduce(
            (totalCapacidad, id) => totalCapacidad + (disponibles.find((m) => m.id === id)?.capacidad ?? 0),
            0,
          );
          return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">{changeR.nombre} · Mesa actual: {mesaLabel(changeR.mesaIds)}</p>
            {changeErr && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{changeErr}</p>}
            {disponibles.length > 0 ? (
              <div>
                <p className="mb-2 text-xs text-gray-500">Selecciona una o varias mesas (puedes mover a cualquier mesa):</p>
                <MesaPicker mesas={disponibles} selected={changeIds}
                  onToggle={(id) => setChangeIds((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])} />
                <p className={`mt-2 text-xs font-semibold ${capacidad >= changeR.personas ? "text-emerald-700" : "text-gray-500"}`}>
                  Capacidad seleccionada: {capacidad} / {changeR.personas}
                </p>
              </div>
            ) : (
              <p className="rounded-xl bg-gray-100 px-3 py-4 text-center text-sm text-gray-600">
                No hay otra mesa disponible en este momento.
              </p>
            )}
            <button onClick={() => submitChange()}
              disabled={!changeIds.length || capacidad < changeR.personas}
              className="w-full rounded-xl bg-emerald-700 py-3 font-bold text-white hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300">
              Guardar cambio
            </button>
          </div>
          );
        })()}
      </Modal>
    </div>
  );
}
