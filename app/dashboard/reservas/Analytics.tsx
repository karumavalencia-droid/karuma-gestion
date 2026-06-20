"use client";

import { useState, useEffect } from "react";
import { getAnalytics, type AnalyticsData, type CanalLocal } from "@/lib/reservas/local-store";

const CANAL_LABELS: Record<string, string> = {
  google: "Google", instagram: "Instagram", telefono: "Teléfono",
  web: "Web", presencial: "Presencial", otro: "Otro", online: "Online",
};
const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const CANAL_COLORS: Record<string, string> = {
  google: "bg-blue-500", instagram: "bg-pink-500", telefono: "bg-emerald-500",
  web: "bg-indigo-500", presencial: "bg-amber-500", otro: "bg-gray-400", online: "bg-sky-500",
};

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Analytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [dias, setDias] = useState(30);

  useEffect(() => {
    setData(getAnalytics(dias));
  }, [dias]);

  if (!data) return <p className="py-12 text-center text-gray-400">Cargando…</p>;

  const maxDia = Math.max(...data.porDiaSemana, 1);
  const canalEntries = Object.entries(data.porCanal).sort((a, b) => b[1] - a[1]);
  const maxCanal = Math.max(...canalEntries.map(([, v]) => v), 1);

  const horaEntries = Object.entries(data.porHora)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(0, 12);
  const maxHora = Math.max(...horaEntries.map(([, v]) => v), 1);

  return (
    <div className="space-y-6 pb-8">
      {/* Period selector */}
      <div className="flex gap-2">
        {[7, 30, 90].map((d) => (
          <button key={d} onClick={() => setDias(d)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
              dias === d ? "bg-karuma-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}>
            {d} días
          </button>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Reservas", value: data.totalReservas, color: "text-gray-900" },
          { label: "Pax total", value: data.totalPax, color: "text-emerald-600" },
          { label: "Pax promedio", value: data.paxPromedio.toFixed(1), color: "text-indigo-600" },
          { label: "Cancelación", value: `${Math.round(data.tasaCancelacion * 100)}%`, color: "text-red-500" },
        ].map((k) => (
          <div key={k.label} className="rounded-xl border border-gray-200 bg-white p-4 text-center shadow-sm">
            <p className={`text-2xl font-black ${k.color}`}>{k.value}</p>
            <p className="mt-0.5 text-xs text-gray-400">{k.label}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Canal de captación */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-gray-700">Canal de captación</h3>
          {canalEntries.length === 0 ? (
            <p className="text-xs text-gray-400">Sin datos aún. Registra el canal al crear reservas.</p>
          ) : (
            <div className="space-y-2.5">
              {canalEntries.map(([canal, count]) => (
                <div key={canal}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="text-gray-600">{CANAL_LABELS[canal] ?? canal}</span>
                    <span className="font-bold text-gray-900">{count}</span>
                  </div>
                  <Bar value={count} max={maxCanal} color={CANAL_COLORS[canal] ?? "bg-gray-400"} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Por día de semana */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-gray-700">Reservas por día de semana</h3>
          <div className="flex items-end gap-1.5 h-24">
            {data.porDiaSemana.map((v, i) => {
              const pct = maxDia > 0 ? (v / maxDia) * 100 : 0;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[9px] font-bold text-gray-500">{v > 0 ? v : ""}</span>
                  <div className="w-full rounded-sm bg-karuma-600" style={{ height: `${Math.max(pct, 4)}%` }} />
                  <span className="text-[9px] text-gray-400">{DIAS[i]}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Por hora */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-gray-700">Distribución por hora</h3>
          {horaEntries.length === 0 ? (
            <p className="text-xs text-gray-400">Sin datos aún.</p>
          ) : (
            <div className="space-y-1.5">
              {horaEntries.map(([hora, count]) => (
                <div key={hora} className="flex items-center gap-2">
                  <span className="w-10 text-right text-xs text-gray-500">{hora}</span>
                  <div className="flex-1">
                    <Bar value={count} max={maxHora} color="bg-indigo-400" />
                  </div>
                  <span className="w-4 text-xs font-bold text-gray-700">{count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top clientes */}
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <h3 className="mb-3 text-sm font-bold text-gray-700">Clientes más frecuentes</h3>
          {data.topClientes.length === 0 ? (
            <p className="text-xs text-gray-400">Sin datos aún.</p>
          ) : (
            <div className="space-y-2">
              {data.topClientes.map((c, i) => (
                <div key={c.telefono} className="flex items-center gap-3">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black text-white ${
                    i === 0 ? "bg-amber-500" : i === 1 ? "bg-gray-400" : i === 2 ? "bg-orange-700" : "bg-gray-200 text-gray-600"
                  }`}>{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-800">{c.nombre}</p>
                    <p className="text-xs text-gray-400">{c.telefono}</p>
                  </div>
                  <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-black text-white">{c.visitas}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* No show rate */}
      {data.tasaNoShow > 0 && (
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <p className="text-sm text-yellow-800">
            <span className="font-bold">No Show:</span> {Math.round(data.tasaNoShow * 100)}% en los últimos {dias} días
            {data.tasaNoShow > 0.1 && " — considera pedir confirmación por SMS"}
          </p>
        </div>
      )}
    </div>
  );
}
