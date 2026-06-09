export type HoursWarningLevel = "low" | "ok" | "high";

export function getHoursWarningLevel(hours: number): HoursWarningLevel {
  if (hours > 40) return "high";
  if (hours >= 35) return "ok";
  return "low";
}

export const HOURS_WARNING_STYLE: Record<
  HoursWarningLevel,
  { label: string; cell: string; badge: string }
> = {
  high: {
    label: ">40h",
    cell: "bg-red-50 text-red-700 font-semibold",
    badge: "bg-red-100 text-red-800 ring-red-600/20",
  },
  ok: {
    label: "35–40h",
    cell: "bg-orange-50 text-orange-700 font-semibold",
    badge: "bg-orange-100 text-orange-800 ring-orange-600/20",
  },
  low: {
    label: "<35h",
    cell: "bg-emerald-50 text-emerald-700 font-semibold",
    badge: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  },
};
