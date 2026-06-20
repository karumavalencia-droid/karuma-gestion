"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Mesa, Reserva, EstadoReserva } from "@/lib/reservas/types";
import { X, Users, Clock } from "lucide-react";
import { ReservasNav } from "@/components/reservas/ReservasNav";

const ESTADO_STYLES: Record<string, { bg: string; border: string; text: string; label: string }> = {
  libre:      { bg: "bg-gray-700",     border: "border-gray-500",   text: "text-gray-300",   label: "Libre" },
  Confirmada: { bg: "bg-emerald-800",  border: "border-emerald-500", text: "text-emerald-100", label: "Reservada" },
  Sentado:    { bg: "bg-red-800",      border: "border-red-500",    text: "text-red-100",    label: "Sentado" },
  WalkIn:     { bg: "bg-pink-800",     border: "border-pink-500",   text: "text-pink-100",   label: "Walk-In" },
  NoShow:     { bg: "bg-gray-800",     border: "border-gray-600",   text: "text-gray-500",   label: "No Show" },
  Finalizada: { bg: "bg-gray-700",     border: "border-gray-600",   text: "text-gray-500",   label: "Finalizada" },
};

interface MesaConReserva extends Mesa {
  reserva?: Reserva & { cliente_nombre?: string };
  estadoActual: string;
}

export default function MesaViewPage() {
  const [mesas, setMesas] = useState<MesaConReserva[]>([]);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [servicio, setServicio] = useState<"comida" | "cena">(
    new Date().getHours() < 17 ? "comida" : "cena",
  );
  const [seleccionada, setSeleccionada] = useState<MesaConReserva | null>(null);
  const [loading, setLoading] = useState(true);

  const cargar = useCallback(async () => {
    setLoading(true);
    const sb = getSupabaseClient();
    if (!sb) { setLoading(false); return; }

    const [{ data: mesasData }, { data: reservasData }] = await Promise.all([
      sb.from("mesas").select("*").eq("activa", true).order("numero"),
      sb
        .from("reservas")
        .select("*, cliente:clientes_reservas(nombre)")
        .eq("fecha", fecha)
        .eq("servicio", servicio)
        .not("estado", "in", '("Cancelada","Finalizada")'),
    ]);

    const reservasPorMesa = new Map<number, Reserva & { cliente_nombre?: string }>();
    for (const r of (reservasData ?? []) as Array<Record<string, unknown>>) {
      const reserva = r as unknown as Reserva & { cliente: { nombre?: string } | null };
      for (const mId of reserva.mesa_ids) {
        reservasPorMesa.set(mId, {
          ...reserva,
          cliente_nombre: reserva.cliente?.nombre ?? "—",
        });
      }
    }

    setMesas(
      ((mesasData ?? []) as Mesa[]).map((m) => {
        const r = reservasPorMesa.get(m.id);
        return { ...m, reserva: r, estadoActual: r ? r.estado : "libre" };
      }),
    );
    setLoading(false);
  }, [fecha, servicio]);

  useEffect(() => { cargar(); }, [cargar]);

  // Realtime: re-load whenever any reservation changes
  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb) return;
    const channel = sb
      .channel("mesa-view-reservas")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservas" }, () => {
        cargar();
      })
      .subscribe();
    return () => { void sb.removeChannel(channel); };
  }, [cargar]);

  async function cambiarEstado(reservaId: string, estado: EstadoReserva) {
    const sb = getSupabaseClient();
    if (!sb) return;
    await sb.from("reservas").update({ estado }).eq("id", reservaId);
    setSeleccionada(null);
    cargar();
  }

  const ocupadas = mesas.filter((m) => m.estadoActual !== "libre").length;
  const libres = mesas.filter((m) => m.estadoActual === "libre").length;
  const personasActuales = mesas
    .filter((m) => m.reserva && (m.estadoActual === "Sentado" || m.estadoActual === "WalkIn"))
    .reduce((sum, m) => sum + (m.reserva?.personas ?? 0), 0);

  return (
    <div className="-m-3 min-h-[calc(100dvh)] bg-gray-950 p-4 text-gray-100 sm:-m-4 md:-m-6 md:p-6">
      <div className="mx-auto max-w-4xl">
        <ReservasNav />

        {/* Top bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
          />
          <div className="flex overflow-hidden rounded-lg border border-gray-700">
            {(["comida", "cena"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setServicio(s)}
                className={`px-5 py-2 text-sm font-medium transition-colors ${
                  servicio === s ? "bg-karuma-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                {s === "comida" ? "🍱 Comida" : "🍣 Cena"}
              </button>
            ))}
          </div>
        </div>

        {/* Stats row */}
        <div className="mb-5 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-gray-800 p-3 text-center">
            <p className="text-2xl font-bold text-white">{mesas.length}</p>
            <p className="text-xs text-gray-400">Total mesas</p>
          </div>
          <div className="rounded-xl bg-emerald-900/50 p-3 text-center">
            <p className="text-2xl font-bold text-emerald-300">{ocupadas}</p>
            <p className="text-xs text-emerald-400">Ocupadas</p>
          </div>
          <div className="rounded-xl bg-gray-700/50 p-3 text-center">
            <p className="text-2xl font-bold text-gray-300">{libres}</p>
            <p className="text-xs text-gray-400">Libres</p>
          </div>
        </div>

        {/* Leyenda */}
        <div className="mb-5 flex flex-wrap gap-3 text-xs">
          {Object.entries(ESTADO_STYLES).map(([key, s]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-sm ${s.bg}`} />
              <span className="text-gray-400">{s.label}</span>
            </span>
          ))}
        </div>

        {/* Grid de mesas */}
        {loading ? (
          <div className="py-16 text-center">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-700 border-t-karuma-600" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
            {mesas.map((m) => {
              const st = ESTADO_STYLES[m.estadoActual] ?? ESTADO_STYLES.libre;
              return (
                <button
                  key={m.id}
                  onClick={() => setSeleccionada(m)}
                  className={`group relative rounded-xl border-2 p-3 text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${st.bg} ${st.border}`}
                >
                  <p className={`text-base font-black ${st.text}`}>{m.numero}</p>
                  <p className="text-xs text-gray-500">{m.capacidad}p · {m.zona}</p>
                  {m.reserva ? (
                    <>
                      <p className={`mt-1.5 truncate text-xs font-semibold ${st.text}`}>
                        {m.reserva.cliente_nombre}
                      </p>
                      <div className={`mt-0.5 flex items-center gap-1 text-xs ${st.text} opacity-80`}>
                        <Clock className="h-3 w-3" />
                        {m.reserva.hora_inicio.slice(0, 5)}
                        <Users className="ml-1 h-3 w-3" />
                        {m.reserva.personas}
                      </div>
                    </>
                  ) : (
                    <p className="mt-1.5 text-xs text-gray-500">{st.label}</p>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {/* Bottom summary */}
        {!loading && personasActuales > 0 && (
          <div className="mt-6 rounded-xl bg-gray-800 px-4 py-3 text-sm text-gray-300">
            <span className="font-semibold text-white">{personasActuales}</span> personas sentadas ahora
          </div>
        )}
      </div>

      {/* Panel detalle mesa */}
      {seleccionada && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={() => setSeleccionada(null)}>
          <div
            className="w-full max-w-sm rounded-t-2xl bg-gray-900 p-6 sm:rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">Mesa {seleccionada.numero}</h2>
                <p className="text-sm text-gray-400">{seleccionada.capacidad} personas · {seleccionada.zona}</p>
              </div>
              <button
                onClick={() => setSeleccionada(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {seleccionada.reserva ? (
              <div className="space-y-2 text-sm">
                <div className="rounded-xl bg-gray-800 p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cliente</span>
                    <span className="font-semibold">{seleccionada.reserva.cliente_nombre}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Hora</span>
                    <span className="font-semibold">{seleccionada.reserva.hora_inicio.slice(0, 5)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Personas</span>
                    <span className="font-semibold">{seleccionada.reserva.personas}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Estado</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${ESTADO_STYLES[seleccionada.reserva.estado]?.bg ?? ""} ${ESTADO_STYLES[seleccionada.reserva.estado]?.text ?? ""}`}>
                      {ESTADO_STYLES[seleccionada.reserva.estado]?.label ?? seleccionada.reserva.estado}
                    </span>
                  </div>
                  {seleccionada.reserva.notas && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">Notas</span>
                      <span className="text-right max-w-[60%]">{seleccionada.reserva.notas}</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2">
                  {seleccionada.reserva.estado === "Confirmada" && (
                    <button
                      onClick={() => cambiarEstado(seleccionada.reserva!.id, "Sentado")}
                      className="col-span-2 rounded-xl bg-red-700 py-3 text-sm font-bold text-white hover:bg-red-600"
                    >
                      Sentar mesa
                    </button>
                  )}
                  {seleccionada.reserva.estado === "Sentado" && (
                    <button
                      onClick={() => cambiarEstado(seleccionada.reserva!.id, "Finalizada")}
                      className="col-span-2 rounded-xl bg-gray-700 py-3 text-sm font-bold text-white hover:bg-gray-600"
                    >
                      Finalizar
                    </button>
                  )}
                  {(seleccionada.reserva.estado === "Confirmada" || seleccionada.reserva.estado === "WalkIn") && (
                    <button
                      onClick={() => cambiarEstado(seleccionada.reserva!.id, "NoShow")}
                      className="rounded-xl bg-yellow-900 py-2.5 text-xs font-semibold text-yellow-300 hover:bg-yellow-800"
                    >
                      No Show
                    </button>
                  )}
                  {seleccionada.reserva.estado !== "Cancelada" && seleccionada.reserva.estado !== "Finalizada" && (
                    <button
                      onClick={() => cambiarEstado(seleccionada.reserva!.id, "Cancelada")}
                      className="rounded-xl bg-gray-800 py-2.5 text-xs font-semibold text-gray-400 hover:bg-gray-700"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-gray-400">Mesa libre para este servicio</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
