"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Mesa, Reserva, EstadoReserva } from "@/lib/reservas/types";
import { X } from "lucide-react";
import { ReservasNav } from "@/components/reservas/ReservasNav";

const ESTADO_BG: Record<string, string> = {
  libre: "bg-gray-700 border-gray-600",
  Confirmada: "bg-emerald-800 border-emerald-600",
  Sentado: "bg-red-800 border-red-600",
  WalkIn: "bg-pink-800 border-pink-600",
  NoShow: "bg-gray-800 border-gray-700",
  Finalizada: "bg-gray-700 border-gray-600",
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

  async function cambiarEstado(reservaId: string, estado: EstadoReserva) {
    const sb = getSupabaseClient();
    if (!sb) return;
    await sb.from("reservas").update({ estado }).eq("id", reservaId);
    setSeleccionada(null);
    cargar();
  }

  return (
    <div className="-m-3 min-h-[calc(100dvh)] bg-gray-950 p-4 text-gray-100 sm:-m-4 md:-m-6 md:p-6">
      <div className="mx-auto max-w-4xl">
        <ReservasNav />
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-bold">Vista Mesas</h1>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
          />
          <div className="flex rounded-lg border border-gray-700 overflow-hidden">
            {(["comida", "cena"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setServicio(s)}
                className={`px-4 py-2 text-sm font-medium ${
                  servicio === s ? "bg-karuma-600 text-white" : "bg-gray-800 text-gray-400"
                }`}
              >
                {s === "comida" ? "Comida" : "Cena"}
              </button>
            ))}
          </div>
        </div>

        {/* Leyenda */}
        <div className="mb-4 flex flex-wrap gap-3 text-xs">
          {[
            { label: "Libre", cls: "bg-gray-700" },
            { label: "Reservada", cls: "bg-emerald-800" },
            { label: "Sentado", cls: "bg-red-800" },
            { label: "Walk-In", cls: "bg-pink-800" },
            { label: "No Show", cls: "bg-gray-800" },
          ].map(({ label, cls }) => (
            <span key={label} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-sm ${cls}`} />
              {label}
            </span>
          ))}
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Cargando…</p>
        ) : (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
            {mesas.map((m) => (
              <button
                key={m.id}
                onClick={() => setSeleccionada(m)}
                className={`rounded-xl border-2 p-3 text-left transition ${ESTADO_BG[m.estadoActual] ?? ESTADO_BG.libre}`}
              >
                <p className="text-sm font-bold">Mesa {m.numero}</p>
                <p className="text-xs text-gray-400">{m.capacidad} pers.</p>
                {m.reserva && (
                  <>
                    <p className="mt-1 truncate text-xs font-medium">{m.reserva.cliente_nombre}</p>
                    <p className="text-xs text-gray-400">{m.reserva.hora_inicio.slice(0, 5)} · {m.reserva.personas}p</p>
                  </>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Panel detalle mesa */}
      {seleccionada && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center">
          <div className="w-full max-w-sm rounded-t-2xl bg-gray-900 p-6 sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">Mesa {seleccionada.numero}</h2>
              <button onClick={() => setSeleccionada(null)}>
                <X className="h-5 w-5 text-gray-400" />
              </button>
            </div>
            <p className="text-sm text-gray-400">Capacidad: {seleccionada.capacidad} personas · {seleccionada.zona}</p>
            {seleccionada.reserva ? (
              <div className="mt-3 space-y-1 text-sm">
                <p><span className="text-gray-400">Cliente:</span> {seleccionada.reserva.cliente_nombre}</p>
                <p><span className="text-gray-400">Hora:</span> {seleccionada.reserva.hora_inicio.slice(0, 5)}</p>
                <p><span className="text-gray-400">Personas:</span> {seleccionada.reserva.personas}</p>
                <p><span className="text-gray-400">Estado:</span> {seleccionada.reserva.estado}</p>
                {seleccionada.reserva.notas && (
                  <p><span className="text-gray-400">Notas:</span> {seleccionada.reserva.notas}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-2">
                  {seleccionada.reserva.estado === "Confirmada" && (
                    <button
                      onClick={() => cambiarEstado(seleccionada.reserva!.id, "Sentado")}
                      className="rounded-lg bg-red-800 px-4 py-2 text-sm font-semibold text-red-200"
                    >
                      Sentar
                    </button>
                  )}
                  {seleccionada.reserva.estado === "Sentado" && (
                    <button
                      onClick={() => cambiarEstado(seleccionada.reserva!.id, "Finalizada")}
                      className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-semibold text-gray-300"
                    >
                      Finalizar
                    </button>
                  )}
                  <button
                    onClick={() => cambiarEstado(seleccionada.reserva!.id, "NoShow")}
                    className="rounded-lg bg-yellow-900 px-4 py-2 text-sm font-semibold text-yellow-300"
                  >
                    No Show
                  </button>
                  <button
                    onClick={() => cambiarEstado(seleccionada.reserva!.id, "Cancelada")}
                    className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-semibold text-gray-400"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">Mesa libre para este servicio.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
