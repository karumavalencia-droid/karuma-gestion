const MADRID_TIME_ZONE = "Europe/Madrid";
export const BUSINESS_DAY_CUTOFF_HOUR = 4;

type MadridParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function madridParts(date: Date): MadridParts {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: MADRID_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
  };
}

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function attendanceBusinessDate(date = new Date()): string {
  const parts = madridParts(date);
  if (parts.hour >= BUSINESS_DAY_CUTOFF_HOUR) {
    return dateKey(parts.year, parts.month, parts.day);
  }
  const previous = new Date(Date.UTC(parts.year, parts.month - 1, parts.day - 1, 12));
  return dateKey(
    previous.getUTCFullYear(),
    previous.getUTCMonth() + 1,
    previous.getUTCDate(),
  );
}

export function madridMinutes(date: Date): number {
  const parts = madridParts(date);
  return parts.hour * 60 + parts.minute;
}

export function madridTimeLabel(iso: string): string {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: MADRID_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso));
}

export function businessDateWeekIndex(businessDate: string): number {
  const [year, month, day] = businessDate.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  return weekday === 0 ? 6 : weekday - 1;
}

export function timeStringToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function minutesToDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  return `${Math.floor(safe / 60)}h ${String(safe % 60).padStart(2, "0")}m`;
}
