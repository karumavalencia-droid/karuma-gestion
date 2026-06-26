"use client";

import type { ServicioLocal } from "@/lib/reservas/local-store";
import { slotsPlano } from "@/lib/reservas/local-store";

type TimeSlotPickerProps = {
  value: string;
  onChange: (hora: string) => void;
  servicio: ServicioLocal;
  className?: string;
  compact?: boolean;
};

export function TimeSlotPicker({
  value,
  onChange,
  servicio,
  className = "",
  compact = false,
}: TimeSlotPickerProps) {
  const slots = slotsPlano(servicio);
  const selected = value.slice(0, 5);
  const isSelectedInSlot = !selected || slots.includes(selected);

  return (
    <div className={className}>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {slots.map((slot) => {
          const active = selected === slot;
          return (
            <button
              key={slot}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(slot)}
              className={`rounded-lg border text-center font-black transition-colors ${
                compact ? "px-2 py-2 text-xs" : "px-3 py-2.5 text-sm"
              } ${
                active
                  ? "border-karuma-600 bg-karuma-600 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-700 hover:border-karuma-500 hover:bg-karuma-50 hover:text-karuma-700"
              }`}
            >
              {slot}
            </button>
          );
        })}
      </div>
      {!isSelectedInSlot && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          Hora actual: {selected}. Elige una franja de 15 min.
        </p>
      )}
    </div>
  );
}
