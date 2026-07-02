import { NextRequest, NextResponse } from "next/server";
import { attendanceBusinessDate } from "@/lib/attendance/time";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { findKioskEmployee } from "@/lib/kiosk/employees";
import { getEmployeeWeek } from "@/lib/schedule/portal";

const WEEKDAY_LABELS = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
] as const;

function isoDateToUtcNoon(isoDate: string): Date {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12));
}

function utcNoonToIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function shortLabel(isoDate: string): string {
  const date = isoDateToUtcNoon(isoDate);
  return `${date.getUTCDate()}/${date.getUTCMonth() + 1}`;
}

export async function GET(request: NextRequest) {
  const user = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!user) {
    return NextResponse.json(
      { code: "not_authenticated", error: "Debes iniciar sesión" },
      { status: 401 },
    );
  }
  if (!user.employeeId) {
    return NextResponse.json(
      {
        code: "not_employee",
        error: "La cuenta no está vinculada a un empleado activo",
      },
      { status: 403 },
    );
  }
  const employee = findKioskEmployee(user.employeeId);
  if (!employee) {
    return NextResponse.json(
      {
        code: "employee_not_found",
        error: "La cuenta no está vinculada a un empleado activo",
      },
      { status: 403 },
    );
  }

  try {
    const week = await getEmployeeWeek(employee.id);

    // Semana actual (lunes a domingo) sobre la fecha de negocio en Madrid.
    const today = attendanceBusinessDate();
    const todayDate = isoDateToUtcNoon(today);
    const jsDay = todayDate.getUTCDay();
    const monday = new Date(todayDate);
    monday.setUTCDate(monday.getUTCDate() + (jsDay === 0 ? -6 : 1 - jsDay));

    const days = Array.from({ length: 7 }, (_, offset) => {
      const date = new Date(monday);
      date.setUTCDate(date.getUTCDate() + offset);
      const isoDate = utcNoonToIsoDate(date);
      const dia = date.getUTCDay();
      const dayData = week.days[dia];
      return {
        date: isoDate,
        dateLabel: shortLabel(isoDate),
        weekday: WEEKDAY_LABELS[dia],
        isToday: isoDate === today,
        descanso: dayData?.descanso ?? true,
        turnos: dayData?.turnos ?? [],
      };
    });

    const sunday = new Date(monday);
    sunday.setUTCDate(sunday.getUTCDate() + 6);

    return NextResponse.json(
      {
        employee: {
          id: employee.id,
          name: employee.name,
          department: employee.department,
        },
        weekLabel: `${shortLabel(utcNoonToIsoDate(monday))} – ${shortLabel(utcNoonToIsoDate(sunday))}`,
        source: week.source,
        days,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        code: "schedule_unavailable",
        error:
          error instanceof Error ? error.message : "No se pudo cargar el horario",
      },
      { status: 503 },
    );
  }
}
