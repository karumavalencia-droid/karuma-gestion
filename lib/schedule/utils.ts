import { WEEK_DAYS, type WeekDay } from "./constants";
import type { DaySchedule, EmployeeSchedule, LeaveRequest } from "./types";

export function getTodayWeekDay(refDate = new Date()): WeekDay {
  const weekday = refDate.getDay();
  const index = weekday === 0 ? 6 : weekday - 1;
  return WEEK_DAYS[index];
}

export function cloneDaySchedule(day: DaySchedule): DaySchedule {
  if (day.type === "work") {
    return { type: "work", segments: day.segments.map((s) => ({ ...s })) };
  }
  return { ...day };
}

export function cloneSchedules(rows: EmployeeSchedule[]): EmployeeSchedule[] {
  return rows.map((row) => ({
    ...row,
    days: Object.fromEntries(
      WEEK_DAYS.map((d) => [d, cloneDaySchedule(row.days[d])]),
    ) as Record<WeekDay, DaySchedule>,
  }));
}

export function isWorkingDay(day: DaySchedule): boolean {
  return day.type === "work";
}

export function isRestingDay(day: DaySchedule): boolean {
  return day.type === "rest" || day.type === "leave";
}

export function applyLeaves(
  rows: EmployeeSchedule[],
  leaves: LeaveRequest[],
): EmployeeSchedule[] {
  const next = cloneSchedules(rows);
  for (const leave of leaves) {
    if (leave.status !== "已批准") continue;
    const row = next.find((r) => r.id === leave.employeeId);
    if (row) row.days[leave.day] = { type: "leave" };
  }
  return next;
}
