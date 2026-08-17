import { NextRequest, NextResponse } from "next/server";
import { listAttendanceEvents } from "@/lib/attendance/repository";
import { attendanceBusinessDate } from "@/lib/attendance/time";
import { getEmployeeScheduleForDate } from "@/lib/attendance/rules";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { findKioskEmployee } from "@/lib/kiosk/employees";

type HistoryStatus = "present" | "missing" | "off";

function madridDateAtNoon(date: Date): Date {
  const iso = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function dateIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function currentEmployee(request: NextRequest) {
  return verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  ).then((user) => {
    if (!user?.employeeId) return null;
    const employee = findKioskEmployee(user.employeeId);
    return employee ? { user, employee } : null;
  });
}

export async function GET(request: NextRequest) {
  const identity = await currentEmployee(request);
  if (!identity) {
    return NextResponse.json(
      { code: "not_authenticated", error: "Debes iniciar sesión" },
      { status: 401 },
    );
  }

  const requestedDays = Number(request.nextUrl.searchParams.get("days") ?? 31);
  const days = Number.isFinite(requestedDays)
    ? Math.min(90, Math.max(7, Math.floor(requestedDays)))
    : 31;

  try {
    const today = madridDateAtNoon(new Date());
    const dates = Array.from({ length: days }, (_, index) => {
      const date = new Date(today);
      date.setUTCDate(today.getUTCDate() - index);
      return dateIso(date);
    });
    const rows = await Promise.all(
      dates.map(async (date) => {
        const events = (await listAttendanceEvents(date))
          .filter((event) => event.employeeId === identity.employee.id)
          .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));
        const schedule = getEmployeeScheduleForDate(identity.employee.id, date);
        const planned = schedule?.type === "work";
        const status: HistoryStatus = planned
          ? events.length > 0
            ? "present"
            : "missing"
          : "off";
        return {
          date,
          status,
          planned,
          scheduleLabel:
            !schedule || schedule.type === "rest"
              ? "Descanso"
              : schedule.type === "leave"
                ? "Permiso"
                : schedule.segments.map((segment) => `${segment.start}–${segment.end}`).join(" / "),
          eventCount: events.length,
          firstIn: events.find((event) => event.type === "in")?.occurredAt ?? null,
          lastOut: [...events].reverse().find((event) => event.type === "out")?.occurredAt ?? null,
        };
      }),
    );
    return NextResponse.json(
      {
        employee: { id: identity.employee.id, name: identity.employee.name },
        days: rows,
        summary: {
          present: rows.filter((row) => row.status === "present").length,
          missing: rows.filter((row) => row.status === "missing").length,
          off: rows.filter((row) => row.status === "off").length,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo cargar el histórico" },
      { status: 503 },
    );
  }
}
