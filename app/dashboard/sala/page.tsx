"use client";

// Sala: la página de recepción en una sola pantalla (igual que el sistema de Spicy Soul).
// Arriba la reserva rápida (texto o voz en chino/español), los totales de Comida / Cena / Día,
// a la izquierda la lista del día con «Sentar», y a la derecha el plano o el cronograma.
// Todas las acciones usan las mismas APIs y el mismo almacén local que «Lista» y «Mesas».

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Mic, Zap, Plus, ChevronLeft, ChevronRight, Footprints } from "lucide-react";
import Link from "next/link";
import { ReservasNav } from "@/components/reservas/ReservasNav";
import { restaurantDate } from "@/lib/reservas/view-time";
import { syncAndLoadReservas } from "@/lib/reservas/sync";
import { getSupabaseClient } from "@/lib/supabase/client";
import { postReservaMutation } from "@/lib/reservas/client-mutations";
import { getReservationGuests, isActiveReservation, isTableBlockReservation } from "@/lib/reservas/helpers";
import { parseQuickReserva, nearestTimes } from "@/lib/reservas/quick-parse";
import {
  getMesasConEstado,
  liberarMesa,
  loadMesas,
  loadReservas,
  mesaLabel,
  saveReservas,
  sentarReserva,
  servicioParaHora,
  storeCreatedReservation,
  updateEstado,
  type MesaConEstado,
  type MesaLocal,
  type ReservaLocal,
  type ServicioLocal,
} from "@/lib/reservas/local-store";

type Vista = ServicioLocal | "dia";
type Filtro = "todas" | "confirmada" | "sentada" | "pendiente" | "espera" | "cancelada";
type Espera = { id: string; nombre: string; telefono: string; personas: number; servicio: string; estado: string; created_at: string };

const FECHA_KEY = "karuma_shared_fecha";
const ZONAS = ["Interior", "Terraza", "Privado"];
// Ventanas del cronograma (minutos desde medianoche)
const VENTANA: Record<Vista, [number, number]> = { comida: [12 * 60, 17 * 60 + 30], cena: [19 * 60, 24 * 60 + 30], dia: [12 * 60, 24 * 60 + 30] };

function toMin(h: string): number { const [a, b] = h.slice(0, 5).split(":").map(Number); return a * 60 + (b || 0); }
function nowMin(): number { const p = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date()).split(":"); return (+p[0] % 24) * 60 + +p[1]; }
function nowHora(): string { const m = nowMin(); return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; }
function addDays(d: string, n: number): string { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
function fechaLabel(d: string): string { return new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", month: "numeric", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z")); }
function durTxt(min: number): string { return min < 60 ? `${min} min` : `${Math.floor(min / 60)}h${min % 60 ? String(min % 60).padStart(2, "0") : ""}`; }
const ocupada = (r: ReservaLocal) => r.estado === "sentada" || r.estado === "walkin";
const cuenta = (r: ReservaLocal) => !isTableBlockReservation(r) && r.estado !== "cancelada" && r.estado !== "no-show";

const ESTADO_TXT: Record<string, string> = { pendiente: "Pendiente", confirmada: "Reservada", llegada: "Ha llegado", sentada: "En mesa", walkin: "Walk-in", finished: "Se fue", "no-show": "No show", cancelada: "Cancelada" };

export default function SalaPage() {
  const [fecha, setFecha] = useState<string>(() => restaurantDate());
  const [vista, setVista] = useState<Vista>(() => (nowMin() >= 18 * 60 ? "cena" : "comida"));
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [modo, setModo] = useState<"plano" | "crono">("plano");
  const [buscar, setBuscar] = useState("");
  const [reservas, setReservas] = useState<ReservaLocal[]>([]);
  const [espera, setEspera] = useState<Espera[]>([]);
  const [mesas, setMesas] = useState<MesaConEstado[]>([]);
  const [toast, setToast] = useState("");
  const [, setTick] = useState(0);

  // ── Carga ──────────────────────────────────────────────────────────────────
  const recalcMesas = useCallback((list?: ReservaLocal[]) => {
    const isHoy = fecha === restaurantDate();
    const servicio: ServicioLocal = vista === "dia" ? (nowMin() >= 18 * 60 ? "cena" : "comida") : vista;
    setMesas(getMesasConEstado(fecha, servicio, isHoy ? nowHora() : undefined));
    if (list) setReservas(list);
  }, [fecha, vista]);

  const reload = useCallback(async () => {
    try { recalcMesas(await syncAndLoadReservas(fecha)); }
    catch { recalcMesas(loadReservas().filter((r) => r.fecha === fecha)); }
    fetch(`/api/reservas/lista-espera?fecha=${fecha}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { entradas: [] }))
      .then((d: { entradas?: Espera[] }) => setEspera(d.entradas ?? []))
      .catch(() => setEspera([]));
  }, [fecha, recalcMesas]);

  useEffect(() => { try { localStorage.setItem(FECHA_KEY, fecha); } catch { /* sin almacenamiento */ } }, [fecha]);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb) return;
    const ch = sb.channel("reservas_sala_sync");
    for (const table of ["reservas", "mesas", "lista_espera"] as const) ch.on("postgres_changes", { event: "*", schema: "public", table }, () => { void reload(); });
    ch.subscribe();
    return () => { void ch.unsubscribe(); };
  }, [reload]);
  useEffect(() => { const id = setInterval(() => { setTick((t) => t + 1); void reload(); }, 60_000); return () => clearInterval(id); }, [reload]);

  function aviso(t: string) { setToast(t); window.setTimeout(() => setToast((x) => (x === t ? "" : x)), 4000); }

  // ── Acciones (mismo patrón que «Lista»: cambio local inmediato + API; si falla se revierte) ──
  async function mutar(local: () => { ok: boolean; error?: string } | void, url: string | null, body: Record<string, unknown>, ok: string) {
    const snapshot = loadReservas();
    const res = local();
    if (res && !res.ok) { aviso(res.error ?? "No se pudo actualizar."); return; }
    recalcMesas(loadReservas().filter((r) => r.fecha === fecha));
    if (url) {
      const r = await postReservaMutation(url, body);
      if (!r.ok) { saveReservas(snapshot); recalcMesas(loadReservas().filter((x) => x.fecha === fecha)); aviso(r.error); return; }
    }
    aviso(ok);
    void reload();
  }
  const sentar = (r: ReservaLocal) => mutar(() => sentarReserva(r.id), r.origen ? "/api/reservas/actualizar-estado" : null, { id: r.id, estado: "sentada" }, `${r.nombre} · en mesa`);
  const liberar = (r: ReservaLocal) => mutar(() => liberarMesa(r.id), r.origen ? "/api/reservas/actualizar-estado" : null, { id: r.id, estado: "finished" }, `${mesaLabel(r.mesaIds)} libre`);
  const noShow = (r: ReservaLocal) => { if (window.confirm(`¿${r.nombre} (${r.hora}) no ha venido?`)) void mutar(() => updateEstado(r.id, "no-show"), r.origen ? "/api/reservas/actualizar-estado" : null, { id: r.id, estado: "no-show" }, "Marcado como no show"); };

  async function walkInEn(m: MesaLocal) {
    const p = window.prompt(`Walk-in en ${m.id} (${m.capacidad} plazas). ¿Cuántas personas?`, String(Math.min(2, m.capacidad)));
    const personas = Number(p);
    if (!p || !(personas >= 1)) return;
    const hora = nowHora();
    const servicio = servicioParaHora(hora);
    const res = await fetch("/api/reservas/crear", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fecha: restaurantDate(), hora, servicio, personas, nombre: "Walk-In", telefono: "", notas: "", origen: "walkin", forceMesaIds: [m.numero] }),
    }).then((r) => r.json()).catch(() => ({ ok: false })) as { ok?: boolean; error?: string; reservaId?: string; mesaIds?: number[] };
    if (!res.ok) { aviso(res.error ?? "No se pudo registrar el walk-in."); return; }
    if (res.reservaId) storeCreatedReservation({ id: res.reservaId, fecha: restaurantDate(), hora, servicio, personas, mesaIds: (res.mesaIds ?? [m.numero]).map((n) => `T${n}`), nombre: "Walk-In", origen: "walkin" });
    aviso(`${m.id} · walk-in ${personas} pers.`);
    void reload();
  }

  // ── Datos derivados ────────────────────────────────────────────────────────
  const delDia = reservas.filter((r) => r.fecha === fecha);
  const resumen = (s?: ServicioLocal) => {
    const l = delDia.filter((r) => cuenta(r) && (!s || r.servicio === s));
    return { n: l.length, pax: l.reduce((a, r) => a + getReservationGuests(r), 0) };
  };
  const enVista = delDia.filter((r) => !isTableBlockReservation(r) && (vista === "dia" || r.servicio === vista));
  const q = buscar.trim().toLowerCase();
  const lista = enVista
    .filter((r) => !q || r.nombre.toLowerCase().includes(q) || r.telefono.includes(q))
    .filter((r) => filtro === "todas" ? r.estado !== "cancelada"
      : filtro === "confirmada" ? r.estado === "confirmada" || r.estado === "llegada"
      : filtro === "sentada" ? ocupada(r)
      : filtro === "pendiente" ? r.estado === "pendiente"
      : filtro === "cancelada" ? r.estado === "cancelada" || r.estado === "no-show" : false)
    .sort((a, b) => (r2(a) - r2(b)) || toMin(a.hora) - toMin(b.hora));
  // En «Todas»: primero lo que está por llegar, luego en mesa, al final los que ya se fueron
  function r2(r: ReservaLocal) { return r.estado === "finished" || r.estado === "no-show" ? 2 : 0; }
  const esperaVista = espera.filter((e) => e.estado === "esperando" && (vista === "dia" || e.servicio === vista));
  const count = (f: Filtro) => f === "espera" ? esperaVista.length : enVista.filter((r) => f === "confirmada" ? r.estado === "confirmada" || r.estado === "llegada" : f === "sentada" ? ocupada(r) : f === "pendiente" ? r.estado === "pendiente" : f === "cancelada" ? r.estado === "cancelada" || r.estado === "no-show" : r.estado !== "cancelada").length;

  return (
    <div className="mx-auto max-w-[1500px] px-3 pb-10 sm:px-5">
      <ReservasNav />
      <div className="rounded-3xl bg-[#1b1514] p-3 text-[#f3e9e1] sm:p-5">
        <QuickBar fecha={fecha} onDone={(d) => { if (d && d !== fecha) setFecha(d); else void reload(); }} aviso={aviso} />

        {/* Fecha */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Buscar cliente o teléfono"
            className="min-w-[200px] flex-1 rounded-full border border-[#3a2f2d] bg-[#241c1b] px-4 py-2 text-sm text-[#f3e9e1] placeholder:text-[#8a7a70]" />
          <Link href="/dashboard/reservas" className="rounded-full bg-[#f5c518] px-4 py-2 text-sm font-semibold text-[#111]"><Plus className="mr-1 inline h-4 w-4" />Reserva completa</Link>
          <div className="flex items-center gap-1 rounded-full border border-[#3a2f2d] bg-[#241c1b] px-2 py-1">
            <button className="p-1" onClick={() => setFecha(addDays(fecha, -1))} aria-label="Día anterior"><ChevronLeft className="h-4 w-4" /></button>
            <input type="date" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} className="bg-transparent text-sm font-semibold text-[#f3e9e1] [color-scheme:dark]" />
            {fecha !== restaurantDate() && <button className="rounded-full bg-[#3a2f2d] px-2 text-xs" onClick={() => setFecha(restaurantDate())}>Hoy</button>}
            <button className="p-1" onClick={() => setFecha(addDays(fecha, 1))} aria-label="Día siguiente"><ChevronRight className="h-4 w-4" /></button>
          </div>
        </div>

        {/* Comida / Cena / Día */}
        <div className="mt-3 grid grid-cols-3 gap-2">
          {([["comida", "Mediodía"], ["cena", "Noche"], ["dia", "Día completo"]] as [Vista, string][]).map(([v, t]) => {
            const s = resumen(v === "dia" ? undefined : v);
            return (
              <button key={v} onClick={() => setVista(v)} className={`rounded-2xl border p-3 text-left ${vista === v ? "border-[#f5c518] bg-[#3a2a1f]" : "border-[#3a2f2d] bg-[#241c1b]"}`}>
                <div className={`font-bold ${vista === v ? "text-[#f5c518]" : ""}`}>{t}</div>
                <div className="text-sm text-[#c8bcb4]">{s.n} reservas · {s.pax} pers.</div>
              </button>
            );
          })}
        </div>

        {/* Filtros + Plano/Cronograma */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {([["todas", "Todas"], ["confirmada", "Reservada"], ["sentada", "En mesa"], ["pendiente", "Pendiente"], ["espera", "Lista de espera"], ["cancelada", "Canceladas"]] as [Filtro, string][]).map(([f, t]) => (
            <button key={f} onClick={() => setFiltro(f)} className={`rounded-full border px-3 py-1 text-sm ${filtro === f ? "border-[#f3e9e1] bg-[#f3e9e1] text-[#111]" : "border-[#3a2f2d] text-[#e6dcd4]"}`}>
              {t}{count(f) ? <span className="ml-1 opacity-70">{count(f)}</span> : null}
            </button>
          ))}
          <div className="ml-auto flex rounded-full border border-[#3a2f2d] bg-[#241c1b] p-1">
            {([["plano", "Plano"], ["crono", "Cronograma"]] as ["plano" | "crono", string][]).map(([m, t]) => (
              <button key={m} onClick={() => setModo(m)} className={`rounded-full px-4 py-1 text-sm font-semibold ${modo === m ? "bg-[#f5c518] text-[#111]" : "text-[#c8bcb4]"}`}>{t}</button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(320px,420px)_1fr]">
          {/* Lista */}
          <div className="space-y-2 rounded-2xl bg-[#241c1b] p-2">
            {filtro === "espera"
              ? (esperaVista.length ? esperaVista.map((e) => (
                  <div key={e.id} className="flex items-center gap-3 rounded-xl border-l-4 border-[#7c6cf0] bg-[#2c2322] p-3">
                    <div className="flex-1"><div className="font-semibold">{e.nombre}</div><div className="text-xs text-[#a89a92]">{e.telefono} · {e.servicio === "cena" ? "Cena" : "Comida"}</div></div>
                    <div className="font-semibold">{e.personas} pers.</div>
                  </div>
                )) : <p className="p-4 text-sm text-[#a89a92]">Nadie en lista de espera.</p>)
              : (lista.length ? lista.map((r) => (
                  <Fila key={r.id} r={r} hoy={fecha === restaurantDate()} onSentar={() => sentar(r)} onLiberar={() => liberar(r)} onNoShow={() => noShow(r)} />
                )) : <p className="p-4 text-sm text-[#a89a92]">No hay reservas para este filtro.</p>)}
          </div>

          {/* Plano o cronograma */}
          <div className="rounded-2xl bg-[#241c1b] p-2">
            {modo === "plano"
              ? <Plano mesas={mesas} delDia={delDia} vista={vista} hoy={fecha === restaurantDate()} onLibre={walkInEn} onSentar={sentar} onLiberar={liberar} />
              : <Cronograma mesas={loadMesas()} delDia={delDia} vista={vista} hoy={fecha === restaurantDate()} />}
          </div>
        </div>
      </div>
      {toast && <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#111] px-5 py-2 text-sm text-white shadow-lg">{toast}</div>}
    </div>
  );
}

// ── Una fila de la lista ─────────────────────────────────────────────────────
function Fila({ r, hoy, onSentar, onLiberar, onNoShow }: { r: ReservaLocal; hoy: boolean; onSentar: () => void; onLiberar: () => void; onNoShow: () => void }) {
  const tarde = hoy && (r.estado === "confirmada" || r.estado === "pendiente") && nowMin() - toMin(r.hora) > 15;
  const enMesa = ocupada(r);
  const hecho = r.estado === "finished" || r.estado === "no-show" || r.estado === "cancelada";
  const desde = enMesa && r.seatedAt ? Math.max(0, Math.round((Date.now() - Date.parse(r.seatedAt)) / 60000)) : null;
  return (
    <div className={`flex items-center gap-3 rounded-xl border-l-4 bg-[#2c2322] p-3 ${enMesa ? "border-[#1fbf6a]" : hecho ? "border-[#5a4a44] opacity-60" : tarde ? "border-[#ff6b6b]" : "border-[#f5a623]"}`}>
      <div className="w-12 text-center text-lg font-bold">{r.mesaIds.length ? mesaLabel(r.mesaIds).replace(/T/g, "") : "—"}</div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{r.hora} {r.nombre}</div>
        <div className="truncate text-xs text-[#a89a92]">
          {ESTADO_TXT[r.estado] ?? r.estado}{r.telefono ? ` · ${r.telefono}` : ""}{tarde ? " · ¡no ha llegado!" : ""}{desde != null ? ` · en mesa ${durTxt(desde)}` : ""}
        </div>
        {r.notas ? <div className="truncate text-xs text-[#f5c518]">{r.notas}</div> : null}
      </div>
      <div className="whitespace-nowrap font-semibold">{getReservationGuests(r)} pers.</div>
      {(r.estado === "confirmada" || r.estado === "llegada" || r.estado === "pendiente") && (
        <div className="flex flex-col gap-1">
          <button onClick={onSentar} className="rounded-lg bg-[#1fbf6a] px-3 py-2 text-sm font-semibold text-white">Sentar</button>
          {tarde && <button onClick={onNoShow} className="rounded-lg border border-[#5a4a44] px-2 py-0.5 text-xs">No show</button>}
        </div>
      )}
      {enMesa && <button onClick={onLiberar} className="rounded-lg border border-[#5a4a44] px-3 py-2 text-sm">Se fue</button>}
    </div>
  );
}

// ── Plano: mesas por zonas ───────────────────────────────────────────────────
function Plano({ mesas, delDia, vista, hoy, onLibre, onSentar, onLiberar }: {
  mesas: MesaConEstado[]; delDia: ReservaLocal[]; vista: Vista; hoy: boolean;
  onLibre: (m: MesaLocal) => void; onSentar: (r: ReservaLocal) => void; onLiberar: (r: ReservaLocal) => void;
}) {
  const zonas = useMemo(() => {
    const z = [...ZONAS, ...mesas.map((m) => m.zona).filter((x) => !ZONAS.includes(x))];
    return [...new Set(z)].map((n) => ({ n, l: mesas.filter((m) => m.zona === n).sort((a, b) => a.numero - b.numero) })).filter((x) => x.l.length);
  }, [mesas]);
  const ahora = nowMin();
  function siguiente(m: MesaConEstado): ReservaLocal | undefined {
    return delDia.filter((r) => r.mesaIds.includes(m.id) && (r.estado === "confirmada" || r.estado === "pendiente" || r.estado === "llegada") && (vista === "dia" || r.servicio === vista) && r.id !== m.reserva?.id && (!hoy || toMin(r.hora) >= ahora - 15))
      .sort((a, b) => toMin(a.hora) - toMin(b.hora))[0];
  }
  return (
    <div>
      {zonas.map((z) => (
        <div key={z.n} className="mb-3">
          <div className="mb-1 px-1 text-xs uppercase tracking-wide text-[#a89a92]">{z.n}</div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(104px,1fr))] gap-2">
            {z.l.map((m) => {
              const r = m.reserva;
              const st = m.status;
              const sig = siguiente(m);
              const cls = st === "occupied" ? "bg-[#1f8f55]" : st === "reserved" ? "bg-[#d0821c]" : "bg-[#5b4639]";
              const desde = st === "occupied" && r?.seatedAt ? Math.max(0, Math.round((Date.now() - Date.parse(r.seatedAt)) / 60000)) : null;
              return (
                <button key={m.id} onClick={() => (r ? (st === "occupied" ? (window.confirm(`¿${m.id}: ${r.nombre} se ha ido?`) && onLiberar(r)) : onSentar(r)) : hoy && onLibre(m))}
                  className={`min-h-[96px] rounded-xl p-2 text-left text-white ${cls}`} title={r ? r.nombre : hoy ? "Libre — tocar para walk-in" : "Libre"}>
                  <div className="text-xl font-extrabold leading-none">{m.id}</div>
                  <div className="text-xs opacity-90">{r ? `${getReservationGuests(r)}/${m.capacidad}` : `${m.capacidad} plazas`}</div>
                  {r && <div className="mt-1 text-xs font-semibold">{r.hora}</div>}
                  {r && <div className="truncate text-xs">{r.nombre}</div>}
                  {desde != null && <div className="text-[10px] opacity-90">en mesa {durTxt(desde)}</div>}
                  {sig && <div className="mt-1 truncate rounded bg-black/25 px-1 text-[10px]">Luego: {sig.hora} {sig.nombre.split(" ")[0]}</div>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="mt-2 flex flex-wrap gap-3 px-1 text-xs text-[#c8bcb4]">
        <span><i className="mr-1 inline-block h-3 w-3 rounded bg-[#5b4639] align-middle" />Libre{hoy ? " (tocar = walk-in)" : ""}</span>
        <span><i className="mr-1 inline-block h-3 w-3 rounded bg-[#d0821c] align-middle" />Reservada (tocar = sentar)</span>
        <span><i className="mr-1 inline-block h-3 w-3 rounded bg-[#1f8f55] align-middle" />En mesa</span>
      </div>
    </div>
  );
}

// ── Cronograma: una fila por mesa, barras de cada reserva ─────────────────────
function Cronograma({ mesas, delDia, vista, hoy }: { mesas: MesaLocal[]; delDia: ReservaLocal[]; vista: Vista; hoy: boolean }) {
  const [a, b] = VENTANA[vista];
  const span = b - a;
  const pct = (m: number) => `${Math.max(0, Math.min(100, ((m - a) / span) * 100))}%`;
  const horas: number[] = [];
  for (let h = Math.ceil(a / 60); h * 60 <= b; h++) horas.push(h);
  const ahora = nowMin();
  const ordenadas = [...mesas].sort((x, y) => ZONAS.indexOf(x.zona) - ZONAS.indexOf(y.zona) || x.numero - y.numero);
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[720px]">
        <div className="relative ml-14 h-6 text-[10px] text-[#a89a92]">
          {horas.map((h) => <span key={h} className="absolute -translate-x-1/2" style={{ left: pct(h * 60) }}>{String(h % 24).padStart(2, "0")}:00</span>)}
        </div>
        {ordenadas.map((m) => {
          const rs = delDia.filter((r) => r.mesaIds.includes(m.id) && isActiveOrDone(r) && (vista === "dia" || r.servicio === vista));
          return (
            <div key={m.id} className="flex items-center border-t border-[#3a2f2d]">
              <div className="w-14 py-2 text-sm font-bold">{m.id}<span className="ml-1 text-[10px] font-normal text-[#a89a92]">{m.capacidad}</span></div>
              <div className="relative h-9 flex-1">
                {horas.map((h) => <span key={h} className="absolute top-0 h-full border-l border-[#3a2f2d]/60" style={{ left: pct(h * 60) }} />)}
                {rs.map((r) => {
                  const ini = toMin(r.hora) < 6 * 60 ? toMin(r.hora) + 1440 : toMin(r.hora);
                  const fin = ini + (r.duracionMin ?? 90);
                  const color = isTableBlockReservation(r) ? "bg-[#7a3b46]" : ocupada(r) ? "bg-[#1f8f55]" : r.estado === "finished" ? "bg-[#4a3f3b]" : "bg-[#d0821c]";
                  return (
                    <div key={r.id} title={`${r.hora} ${r.nombre} · ${getReservationGuests(r)} pers.`} className={`absolute top-1 bottom-1 overflow-hidden rounded-md px-1 text-[11px] leading-7 text-white ${color}`}
                      style={{ left: pct(ini), width: `calc(${pct(Math.min(fin, b))} - ${pct(ini)})` }}>
                      {r.hora} {isTableBlockReservation(r) ? "Bloqueo" : `${r.nombre.split(" ")[0]} · ${getReservationGuests(r)}`}
                    </div>
                  );
                })}
                {hoy && ahora >= a && ahora <= b && <span className="absolute top-0 h-full w-0.5 bg-[#ff6b6b]" style={{ left: pct(ahora) }} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function isActiveOrDone(r: ReservaLocal): boolean { return isActiveReservation(r.estado) || r.estado === "finished" || isTableBlockReservation(r); }

// ── Reserva rápida: texto o voz ──────────────────────────────────────────────
type SpeechRec = { lang: string; continuous: boolean; interimResults: boolean; start: () => void; stop: () => void;
  onresult: ((ev: { results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onerror: ((ev: { error: string }) => void) | null; onend: (() => void) | null };

function QuickBar({ fecha, onDone, aviso }: { fecha: string; onDone: (fecha?: string) => void; aviso: (t: string) => void }) {
  const [texto, setTexto] = useState("");
  const [msg, setMsg] = useState<string>("");
  const [libres, setLibres] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [escuchando, setEscuchando] = useState<string | null>(null);
  const rec = useRef<SpeechRec | null>(null);
  const base = useRef("");
  const enviarTrasMic = useRef(false);
  const textoRef = useRef("");
  useEffect(() => { textoRef.current = texto; }, [texto]);
  const micOk = typeof window !== "undefined" && !!((window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown }).SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

  async function enviar(txt = texto) {
    if (rec.current) { enviarTrasMic.current = true; rec.current.stop(); return; }
    setLibres([]);
    const p = parseQuickReserva(txt);
    if (!p.phone && !p.party && !p.time) { setMsg("Solo entiendo reservas: nombre · teléfono · personas · hora"); return; }
    const falta = !p.party ? "¿Cuántas personas?" : !p.time ? "¿A qué hora?" : !p.phone ? "¿Teléfono?" : !p.name ? "¿Nombre?" : "";
    if (falta) { setMsg(`Falta preguntar: ${falta} (añádelo en la línea y vuelve a pulsar)`); return; }
    const fechaR = p.dateSaid ? p.date : fecha;
    const servicio: ServicioLocal = servicioParaHora(p.time!);
    setEnviando(true);
    try {
      const r = await fetch("/api/reservas/crear", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fecha: fechaR, hora: p.time, servicio, personas: p.party, nombre: p.name, telefono: p.phone, notas: "", origen: "telefono", ...(p.durationMin ? { duracionMin: p.durationMin } : {}) }),
      });
      const j = await r.json().catch(() => ({})) as { ok?: boolean; error?: string; reservaId?: string; mesaIds?: number[] };
      if (!r.ok || !j.ok) {
        setMsg(j.error ?? "No se pudo crear la reserva.");
        // Lleno o cerrado: proponer las horas libres más cercanas
        if (p.party! <= 6) {
          const slots: string[] = [];
          for (const s of ["comida", "cena"]) {
            const d = await fetch(`/api/reservas/disponibilidad?fecha=${fechaR}&servicio=${s}&personas=${p.party}`).then((x) => x.json()).catch(() => ({})) as { slots?: { hora: string; disponible: boolean }[] };
            (d.slots ?? []).forEach((x) => { if (x.disponible) slots.push(x.hora.slice(0, 5)); });
          }
          setLibres(nearestTimes(slots, p.time!));
        }
        return;
      }
      if (j.reservaId) storeCreatedReservation({ id: j.reservaId, fecha: fechaR, hora: p.time!, servicio, personas: p.party!, mesaIds: (j.mesaIds ?? []).map((n) => `T${n}`), nombre: p.name, telefono: p.phone!, notas: "", origen: "telefono" });
      aviso(`Reservado: ${p.name} · ${p.party} pers. · ${fechaLabel(fechaR)} ${p.time}${j.mesaIds?.length ? ` · mesa ${j.mesaIds.join("+")}` : ""}`);
      setTexto(""); setMsg("");
      onDone(fechaR);
    } finally { setEnviando(false); }
  }

  function mic(lang: string) {
    if (rec.current) { rec.current.stop(); return; }
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const SR = W.SpeechRecognition || W.webkitSpeechRecognition;
    if (!SR) return;
    const r = new SR();
    r.lang = lang; r.continuous = true; r.interimResults = true;
    base.current = texto ? texto + " " : "";
    r.onresult = (ev) => {
      let fin = "", tmp = "";
      for (let i = 0; i < ev.results.length; i++) { const x = ev.results[i]; if (x.isFinal) fin += x[0].transcript + " "; else tmp += x[0].transcript; }
      const t = (base.current + fin + tmp).replace(/\s+/g, " ").trim();
      textoRef.current = t; setTexto(t);
    };
    r.onerror = (ev) => setMsg(ev.error === "not-allowed" ? "Permite el micrófono en el navegador." : `No se ha entendido (${ev.error}).`);
    r.onend = () => {
      rec.current = null; setEscuchando(null);
      const t = textoRef.current;
      if (enviarTrasMic.current) { enviarTrasMic.current = false; void enviar(t); return; }
      const p = parseQuickReserva(t);
      if (t.trim()) setMsg(`Oído: ${p.name || "(sin nombre)"} · ${p.phone || "(sin teléfono)"} · ${p.party ? p.party + " pers." : "(sin personas)"} · ${p.date.slice(8)}/${p.date.slice(5, 7)} ${p.time || "(sin hora)"} — pulsa «Reservar» si está bien`);
    };
    rec.current = r; setEscuchando(lang); setMsg("🎤 Escuchando… pulsa ■ para parar");
    try { r.start(); } catch { rec.current = null; setEscuchando(null); }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void enviar(); }}>
      <div className="flex flex-wrap gap-2">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Reserva rápida: escribe todo seguido, en cualquier orden. Ej.: Ana 612345678 4 pers mañana 20:30"
          className="min-w-[260px] flex-1 rounded-2xl border-2 border-[#f5c518] bg-white px-4 py-3 text-base text-[#111] placeholder:text-[#8a7a70]" />
        {micOk && <>
          <button type="button" onClick={() => mic("zh-CN")} className={`rounded-2xl border-2 px-4 py-3 font-bold ${escuchando === "zh-CN" ? "border-red-500 bg-red-500 text-white" : "border-[#f5c518] text-[#f5c518]"}`}><Mic className="mr-1 inline h-4 w-4" />{escuchando === "zh-CN" ? "■" : "Chino"}</button>
          <button type="button" onClick={() => mic("es-ES")} className={`rounded-2xl border-2 px-4 py-3 font-bold ${escuchando === "es-ES" ? "border-red-500 bg-red-500 text-white" : "border-[#f5c518] text-[#f5c518]"}`}><Mic className="mr-1 inline h-4 w-4" />{escuchando === "es-ES" ? "■" : "ES"}</button>
        </>}
        <button type="submit" disabled={enviando} className="rounded-2xl bg-[#f5c518] px-5 py-3 font-bold text-[#111] disabled:opacity-60"><Zap className="mr-1 inline h-4 w-4" />Reservar</button>
      </div>
      <div className="mt-1 px-1 text-xs text-[#a89a92]">nombre · teléfono · personas · hora (y día, si no es hoy) <Footprints className="ml-2 inline h-3 w-3" /> mesa libre en el plano = walk-in</div>
      {(msg || libres.length > 0) && (
        <div className="mt-2 rounded-xl bg-[#3a2a1f] px-3 py-2 text-sm text-[#f5d76e]">
          {msg}
          {libres.length > 0 && <span className="ml-2">Horas libres más cercanas:</span>}
          {libres.map((h) => <button key={h} type="button" onClick={() => { const t = `${texto} ${h}`; setTexto(t); void enviar(t.replace(/\b\d{1,2}[:.h]\d{2}\b(?=.*\b\d{1,2}[:.h]\d{2}\b)/, "")); }} className="ml-2 rounded-full bg-[#f5c518] px-3 py-0.5 font-semibold text-[#111]">{h}</button>)}
        </div>
      )}
    </form>
  );
}
