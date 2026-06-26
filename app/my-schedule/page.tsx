"use client";

type ShiftType = "Comida" | "Cena" | "Día completo" | "Descanso" | "Ausencia";

const SHIFT_HOURS: Record<ShiftType, string> = {
  Comida: "12:00-16:30",
  Cena: "20:00-00:00",
  "Día completo": "12:00-16:30\n20:00-00:00",
  Descanso: "",
  Ausencia: "",
};

const SHIFT_COLORS: Record<ShiftType, string> = {
  Comida: "bg-blue-50 text-blue-700 ring-blue-600/20",
  Cena: "bg-amber-50 text-amber-700 ring-amber-600/20",
  "Día completo": "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Descanso: "bg-gray-50 text-gray-600 ring-gray-500/20",
  Ausencia: "bg-red-50 text-red-700 ring-red-600/20",
};

const SHIFT_LABELS: Record<ShiftType, string> = {
  Comida: "Comida",
  Cena: "Cena",
  "Día completo": "Día completo",
  Descanso: "Descanso",
  Ausencia: "Ausencia",
};

const MY_SHIFTS: { id: string; date: string; shift: ShiftType }[] = [
  { id: "1", date: "2026-06-07", shift: "Cena" },
  { id: "2", date: "2026-06-08", shift: "Descanso" },
  { id: "3", date: "2026-06-09", shift: "Cena" },
  { id: "4", date: "2026-06-10", shift: "Comida" },
];

export default function MySchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-gray-900">Pedro · Friegaplatos</p>
        <p className="text-sm text-gray-500">Mi horario (datos mock locales)</p>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Turno</th>
                <th className="px-4 py-3">Horario</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {MY_SHIFTS.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3.5 font-medium text-gray-900">{row.date}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${SHIFT_COLORS[row.shift]}`}
                    >
                      {SHIFT_LABELS[row.shift]}
                    </span>
                  </td>
                  <td className="whitespace-pre-line px-4 py-3.5 text-gray-600">
                    {SHIFT_HOURS[row.shift]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
