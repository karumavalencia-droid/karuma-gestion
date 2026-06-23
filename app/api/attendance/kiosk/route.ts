import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { getEnvironmentAttendancePin } from "@/lib/attendance/credentials";
import {
  createAttendanceEvent,
  findAttendanceEventByRequestId,
  getAttendancePinHash,
  listAttendanceEvents,
} from "@/lib/attendance/repository";
import {
  clearAttendanceFailures,
  isAttendanceAttemptLocked,
  recordAttendanceFailure,
} from "@/lib/attendance/rate-limit";
import { nextAttendanceAction } from "@/lib/attendance/rules";
import { attendanceBusinessDate } from "@/lib/attendance/time";
import type {
  AttendanceEmployeeStatus,
  AttendanceEventType,
} from "@/lib/attendance/types";
import {
  KIOSK_EMPLOYEES,
  findKioskEmployee,
} from "@/lib/kiosk/employees";

const MAX_OFFLINE_AGE_MS = 36 * 60 * 60 * 1000;
const MIN_EVENT_GAP_MS = 20 * 1000;

function employeeStatuses(
  events: Awaited<ReturnType<typeof listAttendanceEvents>>,
): AttendanceEmployeeStatus[] {
  return KIOSK_EMPLOYEES.map((employee) => {
    const employeeEvents = events.filter((event) => event.employeeId === employee.id);
    const last = employeeEvents.at(-1) ?? null;
    return {
      employeeId: employee.id,
      employeeName: employee.name,
      department: employee.department,
      nextAction: nextAttendanceAction(employeeEvents),
      lastType: last?.type ?? null,
      lastTime: last?.occurredAt ?? null,
    };
  });
}

export async function GET() {
  const businessDate = attendanceBusinessDate();
  try {
    const events = await listAttendanceEvents(businessDate);
    return NextResponse.json({
      businessDate,
      serverTime: new Date().toISOString(),
      employees: employeeStatuses(events),
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el fichaje",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  let body: {
    requestId?: string;
    employeeId?: string;
    pin?: string;
    type?: AttendanceEventType;
    clientOccurredAt?: string;
    offline?: boolean;
    deviceId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const requestId = body.requestId?.trim();
  const employeeId = body.employeeId?.trim();
  const pin = body.pin?.trim();
  const type = body.type;
  if (
    !requestId ||
    requestId.length > 100 ||
    !employeeId ||
    !pin ||
    !type ||
    !["in", "out"].includes(type)
  ) {
    return NextResponse.json({ error: "Faltan datos del fichaje" }, { status: 400 });
  }

  const employee = findKioskEmployee(employeeId);
  if (!employee) {
    return NextResponse.json({ error: "Empleado no encontrado" }, { status: 404 });
  }

  try {
    const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const attemptKey = `${forwardedFor || "local"}:${employeeId}`;
    if (isAttendanceAttemptLocked(attemptKey)) {
      return NextResponse.json(
        { error: "Demasiados intentos. Espera 10 minutos." },
        { status: 429 },
      );
    }

    const existing = await findAttendanceEventByRequestId(requestId);
    if (existing) {
      return NextResponse.json({ event: existing, duplicate: true });
    }

    const storedHash = await getAttendancePinHash(employeeId);
    const environmentPin = getEnvironmentAttendancePin(employeeId);
    if (!storedHash && !environmentPin) {
      return NextResponse.json(
        { error: "PIN de empleado no configurado" },
        { status: 503 },
      );
    }
    const validPin = storedHash
      ? await bcrypt.compare(pin, storedHash)
      : pin === environmentPin;
    if (!validPin) {
      recordAttendanceFailure(attemptKey);
      return NextResponse.json({ error: "PIN incorrecto" }, { status: 401 });
    }
    clearAttendanceFailures(attemptKey);

    const now = new Date();
    let occurredAt = now;
    const offline = body.offline === true;
    if (offline && body.clientOccurredAt) {
      const candidate = new Date(body.clientOccurredAt);
      const age = now.getTime() - candidate.getTime();
      if (
        Number.isFinite(candidate.getTime()) &&
        age >= -5 * 60 * 1000 &&
        age <= MAX_OFFLINE_AGE_MS
      ) {
        occurredAt = candidate;
      }
    }

    const businessDate = attendanceBusinessDate(occurredAt);
    const events = await listAttendanceEvents(businessDate);
    const employeeEvents = events.filter((event) => event.employeeId === employeeId);
    const expected = nextAttendanceAction(employeeEvents);
    if (type !== expected) {
      return NextResponse.json(
        {
          error:
            expected === "in"
              ? "La siguiente acción debe ser Entrada"
              : "La siguiente acción debe ser Salida",
          expectedAction: expected,
        },
        { status: 409 },
      );
    }

    const last = employeeEvents.at(-1);
    if (
      last &&
      Math.abs(
        occurredAt.getTime() - new Date(last.occurredAt).getTime(),
      ) < MIN_EVENT_GAP_MS
    ) {
      return NextResponse.json(
        { error: "Espera unos segundos antes de volver a fichar" },
        { status: 429 },
      );
    }

    const event = await createAttendanceEvent({
      requestId,
      employeeId,
      employeeName: employee.name,
      type,
      occurredAt: occurredAt.toISOString(),
      businessDate,
      offline,
      deviceId: body.deviceId?.trim().slice(0, 100) || null,
    });
    return NextResponse.json({ event, duplicate: false }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar el fichaje",
      },
      { status: 503 },
    );
  }
}
