import { NextRequest, NextResponse } from "next/server";
import {
  createAttendanceCorrection,
  listAttendanceCorrections,
} from "@/lib/attendance/repository";
import { attendanceBusinessDate } from "@/lib/attendance/time";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { findKioskEmployee } from "@/lib/kiosk/employees";

async function currentEmployee(request: NextRequest) {
  const user = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!user) return null;
  if (!user.employeeId) return null;
  const employee = findKioskEmployee(user.employeeId);
  return employee ? { user, employee } : null;
}

export async function GET(request: NextRequest) {
  const identity = await currentEmployee(request);
  if (!identity) {
    return NextResponse.json(
      { code: "not_authenticated", error: "Debes iniciar sesión" },
      { status: 401 },
    );
  }
  try {
    return NextResponse.json(
      { requests: await listAttendanceCorrections({ employeeId: identity.employee.id }) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron cargar las solicitudes" },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const identity = await currentEmployee(request);
  if (!identity) {
    return NextResponse.json(
      { code: "not_authenticated", error: "Debes iniciar sesión" },
      { status: 401 },
    );
  }
  let body: { type?: "in" | "out"; occurredAt?: string; reason?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const reason = body.reason?.trim() ?? "";
  const occurredAt = body.occurredAt ? new Date(body.occurredAt) : null;
  if (
    !body.type ||
    !["in", "out"].includes(body.type) ||
    !occurredAt ||
    !Number.isFinite(occurredAt.getTime()) ||
    reason.length < 3 ||
    reason.length > 500
  ) {
    return NextResponse.json(
      { error: "Indica entrada o salida, una fecha válida y el motivo" },
      { status: 400 },
    );
  }
  const now = Date.now();
  if (occurredAt.getTime() > now + 5 * 60_000 || occurredAt.getTime() < now - 14 * 86_400_000) {
    return NextResponse.json(
      { error: "Solo puedes solicitar correcciones de los últimos 14 días" },
      { status: 400 },
    );
  }
  try {
    const businessDate = attendanceBusinessDate(occurredAt);
    const existing = await listAttendanceCorrections({ employeeId: identity.employee.id });
    if (existing.some((row) => row.status === "pending" && row.businessDate === businessDate)) {
      return NextResponse.json(
        { error: "Ya tienes una solicitud pendiente para ese día" },
        { status: 409 },
      );
    }
    const correction = await createAttendanceCorrection({
      employeeId: identity.employee.id,
      employeeName: identity.employee.name,
      type: body.type,
      occurredAt: occurredAt.toISOString(),
      businessDate,
      reason,
    });
    return NextResponse.json({ correction }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo crear la solicitud" },
      { status: 503 },
    );
  }
}
