import { NextRequest, NextResponse } from "next/server";
import {
  getStoreGeofence,
  validateAttendanceLocation,
} from "@/lib/attendance/geofence";
import {
  createAttendanceEvent,
  findAttendanceEventByRequestId,
  listAttendanceEvents,
} from "@/lib/attendance/repository";
import { nextAttendanceAction } from "@/lib/attendance/rules";
import { attendanceBusinessDate } from "@/lib/attendance/time";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { findKioskEmployee } from "@/lib/kiosk/employees";

const MIN_EVENT_GAP_MS = 20 * 1000;

async function currentEmployee(request: NextRequest) {
  const user = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!user) return { ok: false as const, error: "not_authenticated" as const };
  if (!user.employeeId) return { ok: false as const, error: "not_employee" as const };
  const employee = findKioskEmployee(user.employeeId);
  if (!employee) {
    return { ok: false as const, error: "employee_not_found" as const };
  }
  return { ok: true as const, user, employee };
}

function authenticationError(error: string) {
  if (error === "not_authenticated") {
    return NextResponse.json(
      { code: error, error: "Debes iniciar sesión" },
      { status: 401 },
    );
  }
  return NextResponse.json(
    { code: error, error: "La cuenta no está vinculada a un empleado activo" },
    { status: 403 },
  );
}

export async function GET(request: NextRequest) {
  const identity = await currentEmployee(request);
  if (!identity.ok) return authenticationError(identity.error);

  try {
    const businessDate = attendanceBusinessDate();
    const events = (await listAttendanceEvents(businessDate)).filter(
      (event) => event.employeeId === identity.employee.id,
    );
    const last = events.at(-1) ?? null;
    const geofence = getStoreGeofence();

    return NextResponse.json(
      {
        businessDate,
        serverTime: new Date().toISOString(),
        employee: {
          id: identity.employee.id,
          name: identity.employee.name,
          department: identity.employee.department,
        },
        nextAction: nextAttendanceAction(events),
        lastType: last?.type ?? null,
        lastTime: last?.occurredAt ?? null,
        events,
        locationRequired: true,
        geofenceConfigured: Boolean(geofence),
        radiusMeters: geofence?.radiusMeters ?? null,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        code: "attendance_unavailable",
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar el fichaje",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const identity = await currentEmployee(request);
  if (!identity.ok) return authenticationError(identity.error);

  let body: {
    requestId?: string;
    latitude?: number;
    longitude?: number;
    accuracy?: number;
    deviceId?: string;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { code: "invalid_request", error: "Solicitud inválida" },
      { status: 400 },
    );
  }

  const requestId = body.requestId?.trim();
  if (!requestId || requestId.length > 100) {
    return NextResponse.json(
      { code: "invalid_request", error: "Falta el identificador del fichaje" },
      { status: 400 },
    );
  }

  const geofence = getStoreGeofence();
  if (!geofence) {
    return NextResponse.json(
      {
        code: "geofence_not_configured",
        error: "La ubicación del restaurante no está configurada",
      },
      { status: 503 },
    );
  }

  const location = {
    latitude: Number(body.latitude),
    longitude: Number(body.longitude),
    accuracy: Number(body.accuracy),
  };
  const locationResult = validateAttendanceLocation(location, geofence);
  if (!locationResult.valid) {
    const error =
      locationResult.reason === "outside"
        ? "Debes estar en el restaurante para fichar"
        : locationResult.reason === "inaccurate"
          ? "La ubicación no es suficientemente precisa. Acércate a una ventana y vuelve a intentar."
          : "No se pudo validar tu ubicación";
    return NextResponse.json(
      {
        code: `location_${locationResult.reason}`,
        error,
        distanceMeters:
          locationResult.distanceMeters === null
            ? null
            : Math.round(locationResult.distanceMeters),
        radiusMeters: geofence.radiusMeters,
      },
      { status: 403 },
    );
  }

  try {
    const existing = await findAttendanceEventByRequestId(requestId);
    if (existing) {
      if (existing.employeeId !== identity.employee.id) {
        return NextResponse.json(
          { code: "request_conflict", error: "Identificador de fichaje inválido" },
          { status: 409 },
        );
      }
      return NextResponse.json({ event: existing, duplicate: true });
    }

    const occurredAt = new Date();
    const businessDate = attendanceBusinessDate(occurredAt);
    const employeeEvents = (await listAttendanceEvents(businessDate)).filter(
      (event) => event.employeeId === identity.employee.id,
    );
    const last = employeeEvents.at(-1);
    if (
      last &&
      occurredAt.getTime() - new Date(last.occurredAt).getTime() <
        MIN_EVENT_GAP_MS
    ) {
      return NextResponse.json(
        {
          code: "too_soon",
          error: "Espera unos segundos antes de volver a fichar",
        },
        { status: 429 },
      );
    }

    const type = nextAttendanceAction(employeeEvents);
    const event = await createAttendanceEvent({
      requestId,
      employeeId: identity.employee.id,
      employeeName: identity.employee.name,
      type,
      occurredAt: occurredAt.toISOString(),
      businessDate,
      source: "mobile",
      offline: false,
      deviceId: body.deviceId?.trim().slice(0, 100) || null,
      latitude: location.latitude,
      longitude: location.longitude,
      locationAccuracy: location.accuracy,
      distanceFromStore: locationResult.distanceMeters,
    });

    return NextResponse.json(
      {
        event,
        duplicate: false,
        distanceMeters: Math.round(locationResult.distanceMeters),
      },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        code: "attendance_unavailable",
        error:
          error instanceof Error
            ? error.message
            : "No se pudo guardar el fichaje",
      },
      { status: 503 },
    );
  }
}
