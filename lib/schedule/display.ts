import type { DaySchedule } from "./types";
import { formatTimeRange } from "./hours";

export function dayScheduleLines(day: DaySchedule): string[] {
  if (day.type === "rest" || day.type === "leave") return ["休息"];
  return day.segments.map(formatTimeRange);
}

export function isWorkingSchedule(day: DaySchedule): boolean {
  return day.type === "work";
}

/** 单行时段，多段用 " / " 连接 */
export function formatDayTimesInline(day: DaySchedule): string {
  if (!isWorkingSchedule(day)) return "";
  return dayScheduleLines(day).join(" / ");
}
