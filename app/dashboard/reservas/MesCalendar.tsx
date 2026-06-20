"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { ReservaLocal } from "@/lib/reservas/local-store";

const DIAS_SEMANA = ["L", "M", "X", "J", "V", "S", "D"];

function hoy() { return new Date().toISOString().split("T")[0]; }

interface Props {
  reservas: ReservaLocal[];
  fechaSeleccionada: string;
  onSelectFecha: (fecha: string) => void;
}

export function MesCalendar({ reservas, fechaSeleccionada, onSelectFecha }: Props) {
  const [mesRef, setMesRef] = useState(() => {
    const d = new Date(fechaSeleccionada + "T12:00:00");
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const { year, month } = mesRef;

  function prevMes() {
    setMesRef(m => m.month === 0 ? { year: m.year - 1, month: 11 } : { year: m.year, month: m.month - 1 });
  }
  function nextMes() {
    setMesRef(m => m.month === 11 ? { year: m.year + 1, month: 0 } : { year: m.year, month: m.month + 1 });
  }

  // Build calendar grid — Mon-first
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  // Day of week Mon=0..Sun=6
  const startDow = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  // Count reservas per day
  const countMap: Record<string, number> = {};
  const paxMap: Record<string, number> = {};
  for (const r of reservas) {
    if (r.estado === "cancelada" || r.estado === "no-show") continue;
    const [y, m2, d] = r.fecha.split("-").map(Number);
    if (y === year && m2 === month + 1) {
      countMap[d] = (countMap[d] ?? 0) + 1;
      paxMap[d] = (paxMap[d] ?? 0) + r.personas;
    }
  }

  const todayStr = hoy();
  const mesLabel = new Date(year, month).toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  return (
    <div className="mb-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <button onClick={prevMes} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-base font-black capitalize text-gray-900">{mesLabel}</h2>
        <button onClick={nextMes} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {/* Days of week */}
      <div className="mb-1 grid grid-cols-7 text-center">
        {DIAS_SEMANA.map((d) => (
          <div key={d} className="py-1 text-xs font-bold text-gray-400">{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const count = countMap[day] ?? 0;
          const pax = paxMap[day] ?? 0;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === fechaSeleccionada;
          const isPast = dateStr < todayStr;

          return (
            <button
              key={day}
              onClick={() => onSelectFecha(dateStr)}
              className={`relative flex flex-col items-center rounded-xl py-2 text-center transition-colors ${
                isSelected ? "bg-karuma-600 text-white"
                : isToday ? "bg-karuma-50 ring-2 ring-karuma-400"
                : isPast ? "text-gray-300 hover:bg-gray-50"
                : "hover:bg-gray-50"
              }`}
            >
              <span className={`text-sm font-bold ${isSelected ? "text-white" : isPast ? "text-gray-300" : "text-gray-800"}`}>
                {day}
              </span>
              {count > 0 && (
                <>
                  <span className={`mt-0.5 text-[10px] font-bold ${isSelected ? "text-white/80" : "text-karuma-600"}`}>
                    {count}r
                  </span>
                  <span className={`text-[9px] ${isSelected ? "text-white/60" : "text-gray-400"}`}>
                    {pax}p
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>

      <p className="mt-3 text-center text-xs text-gray-400">Toca un día para ver las reservas · <span className="font-bold text-karuma-600">Nº</span>r = reservas · p = pax</p>
    </div>
  );
}
