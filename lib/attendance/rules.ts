import { EMPLOYEE_SCHEDULES } from "../schedule/mock";
import { WEEK_DAYS } from "../schedule/constants";
import type { DaySchedule, TimeRange } from "../schedule/types";
import type {
  AttendanceAnomaly,
  AttendanceDayReport,
  AttendanceDayRow,
  AttendanceEvent,
  AttendanceEventType,
} from "./types";
import {
  attendanceBusinessDate,
  businessDateWeekIndex,
  madridMinutes,
  madridTimeLabel,
  timeStringToMinutes,
} from "./time";

const GRACE_MINUTES = 10;
const MISSING_OUT_GRACE_MINUTES = 30;
const MEAL_START = 12 * 60 + 30;
const MEAL_END = 13 * 60;

export function nextAttendanceAction(events: AttendanceEvent[]): AttendanceEventType {
  const sorted = [...events].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
  return sorted.at(-1)?.type === "in" ? "out" : "in";
}

export function getEmployeeScheduleForDate(
  employeeId: string,
  businessDate: string,
): DaySchedule | null {
  const employee = EMPLOYEE_SCHEDULES.find((row) => row.id === employeeId);
  if (!employee) return null;
  const day = WEEK_DAYS[businessDateWeekIndex(businessDate)];
  return employee.days[day] ?? null;
}

function normalizedEndMinutes(segment: TimeRange): number {
  const start = timeStringToMinutes(segment.start);
  let end = timeStringToMinutes(segment.end);
  if (end <= start) end += 24 * 60;
  return end;
}

function eventLocalMinutes(event: AttendanceEvent): number {
  const [hours, minutes] = madridTimeLabel(event.occurredAt).split(":").map(Number);
  let total = hours * 60 + minutes;
  if (total < 4 * 60) total += 24 * 60;
  return total;
}

function intervalWorkedMinutes(start: AttendanceEvent, end: AttendanceEvent): number {
  const gross = Math.max(
    0,
    Math.round(
      (new Date(end.occurredAt).getTime() - new Date(start.occurredAt).getTime()) /
        60000,
    ),
  );
  const localStart = eventLocalMinutes(start);
  const localEnd = Math.max(localStart, eventLocalMinutes(end));
  const mealOverlap = Math.max(
    0,
    Math.min(localEnd, MEAL_END) - Math.max(localStart, MEAL_START),
  );
  return Math.max(0, gross - mealOverlap);
}

function workedMinutes(events: AttendanceEvent[], now: Date): number {
  const sorted = [...events].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
  let open: AttendanceEvent | null = null;
  let total = 0;
  for (const event of sorted) {
    if (event.type === "in") {
      if (!open) open = event;
      continue;
    }
    if (open) {
      total += intervalWorkedMinutes(open, event);
      open = null;
    }
  }
  if (open && attendanceBusinessDate(now) === open.businessDate) {
    const syntheticOut: AttendanceEvent = {
      ...open,
      id: "current-time",
      requestId: "current-time",
      type: "out",
      occurredAt: now.toISOString(),
      receivedAt: now.toISOString(),
    };
    total += intervalWorkedMinutes(open, syntheticOut);
  }
  return total;
}

function hasDuplicateTransitions(events: AttendanceEvent[]): boolean {
  const sorted = [...events].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime(),
  );
  return sorted.some((event, index) => index > 0 && sorted[index - 1]?.type === event.type);
}

function scheduleLabel(schedule: DaySchedule | null): string {
  if (!schedule || schedule.type === "rest") return "Descanso";
  if (schedule.type === "leave") return "Permiso";
  return schedule.segments.map((segment) => `${segment.start}–${segment.end}`).join(" / ");
}

function evaluationMinute(businessDate: string, now: Date): number {
  const currentBusinessDate = attendanceBusinessDate(now);
  if (businessDate < currentBusinessDate) return 28 * 60;
  if (businessDate > currentBusinessDate) return 0;
  let minute = madridMinutes(now);
  if (minute < 4 * 60) minute += 24 * 60;
  return minute;
}

export function buildAttendanceDayRow(
  employee: { id: string; name: string; department: string },
  businessDate: string,
  events: AttendanceEvent[],
  now = new Date(),
): AttendanceDayRow {
  const employeeEvents = events
    .filter((event) => event.employeeId === employee.id)
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime());
  const schedule = getEmployeeScheduleForDate(employee.id, businessDate);
  const planned = schedule?.type === "work";
  const plannedSegments = planned ? schedule.segments : [];
  const firstInEvent = employeeEvents.find((event) => event.type === "in") ?? null;
  const outEvents = employeeEvents.filter((event) => event.type === "out");
  const lastOutEvent = outEvents.at(-1) ?? null;
  const lastEvent = employeeEvents.at(-1) ?? null;
  const anomalies = new Set<AttendanceAnomaly>();
  const evalMinute = evaluationMinute(businessDate, now);

  if (hasDuplicateTransitions(employeeEvents)) anomalies.add("duplicate");
  if (employeeEvents.some((event) => event.offline)) anomalies.add("offline");
  if (!planned && employeeEvents.length > 0) anomalies.add("unscheduled");

  if (planned) {
    const firstStart = timeStringToMinutes(plannedSegments[0]!.start);
    const lastEnd = normalizedEndMinutes(plannedSegments.at(-1)!);
    if (!firstInEvent && evalMinute > firstStart + GRACE_MINUTES) {
      anomalies.add("absent");
    }
    if (firstInEvent && eventLocalMinutes(firstInEvent) > firstStart + GRACE_MINUTES) {
      anomalies.add("late");
    }
    if (
      lastOutEvent &&
      evalMinute > lastEnd + GRACE_MINUTES &&
      eventLocalMinutes(lastOutEvent) < lastEnd - GRACE_MINUTES
    ) {
      anomalies.add("early");
    }
    if (
      lastEvent?.type === "in" &&
      evalMinute > lastEnd + MISSING_OUT_GRACE_MINUTES
    ) {
      anomalies.add("missing-out");
    }
  }

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    department: employee.department,
    planned,
    plannedLabel: scheduleLabel(schedule),
    firstIn: firstInEvent?.occurredAt ?? null,
    lastOut: lastOutEvent?.occurredAt ?? null,
    currentState:
      employeeEvents.length === 0
        ? "not-started"
        : lastEvent?.type === "in"
          ? "working"
          : "finished",
    workedMinutes: workedMinutes(employeeEvents, now),
    anomalies: [...anomalies],
    events: employeeEvents,
  };
}

export function buildAttendanceDayReport(
  employees: { id: string; name: string; department: string }[],
  businessDate: string,
  events: AttendanceEvent[],
  now = new Date(),
): AttendanceDayReport {
  const rows = employees.map((employee) =>
    buildAttendanceDayRow(employee, businessDate, events, now),
  );
  return {
    date: businessDate,
    generatedAt: now.toISOString(),
    rows,
    summary: {
      scheduled: rows.filter((row) => row.planned).length,
      present: rows.filter((row) => row.firstIn).length,
      working: rows.filter((row) => row.currentState === "working").length,
      finished: rows.filter((row) => row.currentState === "finished").length,
      absent: rows.filter((row) => row.anomalies.includes("absent")).length,
      late: rows.filter((row) => row.anomalies.includes("late")).length,
      early: rows.filter((row) => row.anomalies.includes("early")).length,
      missingOut: rows.filter((row) => row.anomalies.includes("missing-out")).length,
      offline: rows.filter((row) => row.anomalies.includes("offline")).length,
    },
  };
}
