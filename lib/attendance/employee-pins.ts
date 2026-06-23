const DEFAULT_ATTENDANCE_PINS: Record<string, string> = {
  jhoan: "1001",
  isabel: "1002",
  celeste: "1003",
  edu: "1004",
  jeferson: "2001",
  newton: "2002",
  "sebastian-rodriguez": "2003",
  "sebastian-gomez": "2004",
  hoscar: "2005",
  junfeng: "2006",
  mauricio: "2007",
  alex: "2008",
  karina: "2009",
};

function configuredPins(): Record<string, string> {
  const raw = process.env.KARUMA_ATTENDANCE_PINS;
  if (!raw) return DEFAULT_ATTENDANCE_PINS;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const cleaned = Object.fromEntries(
      Object.entries(parsed).filter(
        ([, value]) => typeof value === "string" && /^\d{4}$/.test(value),
      ),
    ) as Record<string, string>;
    return Object.keys(cleaned).length > 0 ? cleaned : DEFAULT_ATTENDANCE_PINS;
  } catch {
    return DEFAULT_ATTENDANCE_PINS;
  }
}

export function getAttendancePin(employeeId: string): string | null {
  return configuredPins()[employeeId] ?? null;
}

export function findEmployeeIdByAttendancePin(pin: string): string | null {
  if (!/^\d{4}$/.test(pin)) return null;
  const match = Object.entries(configuredPins()).find(([, value]) => value === pin);
  return match?.[0] ?? null;
}

export function getAllAttendancePins(): Record<string, string> {
  return { ...configuredPins() };
}
