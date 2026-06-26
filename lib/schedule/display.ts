import type { DaySchedule } from "./types";
import { formatTimeRange } from "./hours";

export function dayScheduleLines(day: DaySchedule): string[] {
  if (day.type === "leave") return ["Ausencia"];
  if (day.type === "rest") return ["Descanso"];
  return day.segments.map(formatTimeRange);
}

export function isWorkingSchedule(day: DaySchedule): boolean {
  return day.type === "work";
}

/** Franja en una línea; varias franjas se unen con " / ". */
export function formatDayTimesInline(day: DaySchedule): string {
  if (!isWorkingSchedule(day)) return "";
  return dayScheduleLines(day).join(" / ");
}
