import { KIOSK_EMPLOYEES } from "./employees";
import { getTodayPunchRecords, type PunchRecord } from "./storage";

export const ADMIN_PIN = "9999";

/** 上班超过此时间记为迟到（当日首次上班打卡） */
const LATE_CUTOFF_HOUR = 11;
const LATE_CUTOFF_MINUTE = 30;

function isLateClockIn(iso: string): boolean {
  const d = new Date(iso);
  const minutes = d.getHours() * 60 + d.getMinutes();
  return minutes > LATE_CUTOFF_HOUR * 60 + LATE_CUTOFF_MINUTE;
}

function firstClockInToday(records: PunchRecord[], employeeId: string): PunchRecord | undefined {
  return records
    .filter((r) => r.employeeId === employeeId && r.type === "in")
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())[0];
}

export type AdminDayStats = {
  present: string[];
  absent: string[];
  late: string[];
};

export function computeTodayAdminStats(at: Date = new Date()): AdminDayStats {
  const today = getTodayPunchRecords(at);
  const present: string[] = [];
  const absent: string[] = [];
  const late: string[] = [];

  for (const emp of KIOSK_EMPLOYEES) {
    const firstIn = firstClockInToday(today, emp.id);
    if (!firstIn) {
      absent.push(emp.name);
      continue;
    }
    present.push(emp.name);
    if (isLateClockIn(firstIn.timestamp)) {
      late.push(emp.name);
    }
  }

  return { present, absent, late };
}
