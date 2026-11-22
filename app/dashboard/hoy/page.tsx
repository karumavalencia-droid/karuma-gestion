"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Clock, LayoutGrid, Users } from "lucide-react";
import { ReservasNav } from "@/components/reservas/ReservasNav";
import { getReservationGuests, isActiveReservation, isTableBlockReservation } from "@/lib/reservas/helpers";
import { syncAndLoadReservas } from "@/lib/reservas/sync";
import { getSupabaseClient } from "@/lib/supabase/client";
import { restaurantDate } from "@/lib/reservas/view-time";
import { postReservaMutation } from "@/lib/reservas/client-mutations";
import {
  duracionReserva,
  loadMesas,
  mesaLabel,
  servicioActual,
  updateEstado,
  type ReservaLocal,
  type ServicioLocal,
} from "@/lib/reservas/local-store";

/** Minutos de cortesía antes de marcar una reserva como "sin llegar". */
const MINUTOS_TOLERANCIA = 15;

const SERVICIO_LABEL: Record<ServicioLocal, string> = { comida: "Comida", cena: "Cena" };

function aMinutos(hora: string): number {
  const [h, m] = hora.slice(0, 5).split(":").map(Number);
  return h * 60 + m;
}

function ahoraMinutos(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function formatoMin(total: number): string {
  const t = Math.abs(Math.round(total));
  return t < 60 ? `${t} min` : `${Math.floor(t / 60)}h ${t % 60 ? `${t % 60}m` : ""}`.trim();
}

function horaDesdeMin(total: number): string {
  const h = Math.floor(total / 60) % 24;
  return `${String(h).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

const esEnMesa = (r: ReservaLocal) => r.estado === "sentada" || r.estado === "walkin";

function Kpi({ label, value, sub, tone }: { label: string; value: string | number; sub?: string; tone?: "warn" | "ok" }) {
  const color = tone === "warn" ? "text-rose-600" : tone === "ok" ? "text-emerald-600" : "text-gray-900";
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-4xl font-bold tabular-nums ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-sm text-gray-500">{sub}</p>}
    </div>
  );
}

export default function HoyPage() {
  const fecha = restaurantDate();
  const [servicio, setServicio] = useState<ServicioLocal>(() => servicioActual());
  const [reservas, setReservas] = useState<ReservaLocal[]>([]);
  const [ahora, setAhora] = useState(ahoraMinutos);
  const [cargado, setCargado] = useState(false);

  const reload = useCallback(() => {
    syncAndLoadReservas(fecha)
      .then((all) => setReservas(all))
      .catch(() => {})
      .finally(() => setCargado(true));
  }, [fecha]);

  useEffect(() => { reload(); }, [reload]);

  // Realtime: cualquier cambio en reservas/mesas refresca el panel.
  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb) return;
    const ch = sb.channel("hoy_sync");
    for (const table of ["reservas", "mesas", "table_sessions"] as const) {
      ch.on("postgres_changes", { event: "*", schema: "public", table }, () => reload());
    }
    ch.subscribe();
    return () => { void ch.unsubscribe(); };
  }, [reload]);

  // El reloj y los datos se refrescan cada minuto.
  useEffect(() => {
    const id = setInterval(() => { setAhora(ahoraMinutos()); reload(); }, 60_000);
    return () => clearInterval(id);
  }, [reload]);

  const [aviso, setAviso] = useState("");

  async function marcarNoShow(r: ReservaLocal) {
    if (!window.confirm(`¿Marcar a ${r.nombre} (${r.hora}, ${getReservationGuests(r)} pax) como NO PRESENTADO?\nSe le anotará un no-show.`)) return;
    updateEstado(r.id, "no-show");
    setReservas((prev) => prev.map((x) => (x.id === r.id ? { ...x, estado: "no-show" } : x)));
    if (r.origen) {
      // Esperar al servidor antes de recargar: si no, la sincronización lee el estado antiguo y revierte el cambio.
      const res = await postReservaMutation("/api/reservas/actualizar-estado", { id: r.id, estado: "no-show" });
      if (!res.ok) setAviso(res.error);
      else setAviso("");
    }
    reload();
  }

  const totalMesas = useMemo(() => loadMesas().length, []);

  const datos = useMemo(() => {
    const del = reservas.filter((r) => r.servicio === servicio && !isTableBlockReservation(r));
    const activas = del.filter((r) => isActiveReservation(r.estado));
    const enMesa = activas.filter(esEnMesa);
    const porLlegar = activas.filter((r) => !esEnMesa(r));
    const terminadas = del.filter((r) => r.estado === "finished");
    const sinLlegar = porLlegar.filter((r) => ahora - aMinutos(r.hora) > MINUTOS_TOLERANCIA);
    const pax = (l: ReservaLocal[]) => l.reduce((s, r) => s + getReservationGuests(r), 0);
    const mesasOcupadas = new Set(enMesa.flatMap((r) => r.mesaIds));
    return {
      enMesa, porLlegar, terminadas, sinLlegar,
      paxEnMesa: pax(enMesa), paxPorLlegar: pax(porLlegar), paxTerminadas: pax(terminadas),
      mesasLibres: Math.max(0, totalMesas - mesasOcupadas.size),
      proximas: [...porLlegar].sort((a, b) => a.hora.localeCompare(b.hora)),
      enUso: [...enMesa]
        .map((r) => {
          const inicio = r.seatedAt ? Math.floor((Date.now() - new Date(r.seatedAt).getTime()) / 60_000) : 0;
          const previsto = r.duracionMin ?? duracionReserva(r.personas);
          return { r, minutos: Math.max(0, inicio), previsto, resto: previsto - Math.max(0, inicio) };
        })
        .sort((a, b) => a.resto - b.resto),
    };
  }, [reservas, servicio, ahora, totalMesas]);

  return (
    <div className="min-h-full bg-[#f7f3ec] p-4 text-gray-900 md:p-6">
      <ReservasNav />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Hoy</h1>
          <p className="flex items-center gap-1.5 text-sm text-gray-500">
            <Clock className="h-4 w-4" />{fecha} · {horaDesdeMin(ahora)}
          </p>
        </div>
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1">
          {(["comida", "cena"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setServicio(s)}
              className={`rounded-lg px-4 py-1.5 text-sm font-semibold ${servicio === s ? "bg-tinta text-white" : "text-gray-600 hover:bg-gray-100"}`}
            >
              {SERVICIO_LABEL[s]}
            </button>
          ))}
        </div>
      </div>

      {aviso && <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{aviso}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Por llegar" value={datos.porLlegar.length} sub={`${datos.paxPorLlegar} pax`} />
        <Kpi label="En mesa" value={datos.enMesa.length} sub={`${datos.paxEnMesa} pax`} tone="ok" />
        <Kpi label="Terminadas" value={datos.terminadas.length} sub={`${datos.paxTerminadas} pax`} />
        <Kpi label="Sin llegar" value={datos.sinLlegar.length} sub={`+${MINUTOS_TOLERANCIA} min de retraso`} tone={datos.sinLlegar.length ? "warn" : undefined} />
        <Kpi label="Mesas libres" value={datos.mesasLibres} sub={`de ${totalMesas}`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><Users className="h-5 w-5" />Próximas llegadas</h2>
          {!cargado ? (
            <p className="text-sm text-gray-500">Cargando…</p>
          ) : datos.proximas.length === 0 ? (
            <p className="text-sm text-gray-500">No queda nadie por llegar.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {datos.proximas.map((r) => {
                const retraso = ahora - aMinutos(r.hora);
                const tarde = retraso > MINUTOS_TOLERANCIA;
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {r.hora} · {r.nombre} <span className="font-normal text-gray-500">· {getReservationGuests(r)} pax</span>
                      </p>
                      <p className="truncate text-sm text-gray-500">
                        {r.mesaIds.length ? mesaLabel(r.mesaIds) : "Sin mesa"}{r.notas ? ` · ${r.notas}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                    {tarde && (
                      <button
                        onClick={() => void marcarNoShow(r)}
                        className="rounded-lg border border-rose-300 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        No vino
                      </button>
                    )}
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tarde ? "bg-rose-100 text-rose-700" : retraso >= 0 ? "bg-amber-100 text-amber-800" : "bg-gray-100 text-gray-600"}`}>
                      {tarde && <AlertTriangle className="mr-1 inline h-3 w-3" />}
                      {retraso >= 0 ? `Hace ${formatoMin(retraso)}` : `En ${formatoMin(retraso)}`}
                    </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-lg font-bold"><LayoutGrid className="h-5 w-5" />Mesas en uso</h2>
          {!cargado ? (
            <p className="text-sm text-gray-500">Cargando…</p>
          ) : datos.enUso.length === 0 ? (
            <p className="text-sm text-gray-500">Ninguna mesa ocupada ahora.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {datos.enUso.map(({ r, minutos, previsto, resto }) => {
                const pasado = resto < 0;
                return (
                  <li key={r.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate font-semibold">
                        {mesaLabel(r.mesaIds)} · {r.nombre} <span className="font-normal text-gray-500">· {getReservationGuests(r)} pax</span>
                      </p>
                      <p className="text-sm text-gray-500">Lleva {formatoMin(minutos)} de {formatoMin(previsto)}</p>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${pasado ? "bg-rose-100 text-rose-700" : resto <= 15 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-700"}`}>
                      {pasado ? `Pasa ${formatoMin(resto)}` : `Libre en ${formatoMin(resto)}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <p className="mt-4 text-center text-sm text-gray-500">
        Para sentar, mover o liberar mesas usa el <Link href="/dashboard/mesa-view" className="font-semibold underline">plano de mesas</Link>.
      </p>
    </div>
  );
}
