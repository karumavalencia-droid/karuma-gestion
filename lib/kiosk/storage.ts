export type PunchType = "in" | "out";

export type PunchRecord = {
  id: string;
  employeeId: string;
  employeeName: string;
  type: PunchType;
  timestamp: string;
  dateKey: string;
};

export type EmployeePunchStatus =
  | { state: "none" }
  | { state: "in"; time: string }
  | { state: "out"; time: string };

const STORAGE_KEY = "karuma-kiosk-records";
const LEGACY_STORAGE_KEY = "karuma_kiosk_punches";

function dateKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function readStorageRaw(): string | null {
  if (typeof window === "undefined") return null;
  const current = localStorage.getItem(STORAGE_KEY);
  if (current) return current;
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy) {
    localStorage.setItem(STORAGE_KEY, legacy);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    return legacy;
  }
  return null;
}

export function loadPunchRecords(): PunchRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = readStorageRaw();
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PunchRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function savePunchRecord(
  employeeId: string,
  employeeName: string,
  type: PunchType,
  at: Date = new Date(),
): PunchRecord {
  const record: PunchRecord = {
    id: `punch-${at.getTime()}`,
    employeeId,
    employeeName,
    type,
    timestamp: at.toISOString(),
    dateKey: dateKeyFromDate(at),
  };
  const all = loadPunchRecords();
  all.push(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  return record;
}

export function getTodayPunchRecords(at: Date = new Date()): PunchRecord[] {
  const key = dateKeyFromDate(at);
  return loadPunchRecords().filter((r) => r.dateKey === key);
}

/** 今日记录，按时间倒序 */
export function getTodayPunchRecordsDesc(at: Date = new Date()): PunchRecord[] {
  return [...getTodayPunchRecords(at)].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

export function formatPunchTime(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale === "es" ? "es-ES" : "zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/** HH:mm，用于状态与成功提示 */
export function formatPunchTimeShort(iso: string, locale: string): string {
  return new Date(iso).toLocaleTimeString(locale === "es" ? "es-ES" : "zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** 根据今日最后一条打卡记录判断员工当前状态 */
export function getEmployeeTodayStatus(
  employeeId: string,
  locale: string,
  at: Date = new Date(),
): EmployeePunchStatus {
  const today = getTodayPunchRecords(at)
    .filter((r) => r.employeeId === employeeId)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  if (today.length === 0) return { state: "none" };

  const last = today[today.length - 1]!;
  const time = formatPunchTimeShort(last.timestamp, locale);
  return last.type === "in" ? { state: "in", time } : { state: "out", time };
}
