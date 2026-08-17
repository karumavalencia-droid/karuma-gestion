import { NextRequest, NextResponse } from "next/server";
import {
  createAttendanceEvent,
  listAttendanceCorrections,
  listAttendanceEvents,
  reviewAttendanceCorrection,
} from "@/lib/attendance/repository";
import { nextAttendanceAction } from "@/lib/attendance/rules";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

async function manager(request: NextRequest) {
  const user = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  return user && (user.role === "owner" || user.role === "manager") ? user : null;
}

export async function GET(request: NextRequest) {
  const user = await manager(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  try {
    const status = request.nextUrl.searchParams.get("status");
    const validStatus = status === "approved" || status === "rejected" ? status : "pending";
    return NextResponse.json(
      { requests: await listAttendanceCorrections({ status: validStatus }) },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudieron cargar las solicitudes" },
      { status: 503 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const user = await manager(request);
  if (!user) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  let body: { id?: string; status?: "approved" | "rejected"; note?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  if (!body.id || !body.status || !["approved", "rejected"].includes(body.status)) {
    return NextResponse.json({ error: "Faltan datos de revisión" }, { status: 400 });
  }
  try {
    const pending = (await listAttendanceCorrections({ status: "pending" })).find(
      (row) => row.id === body.id,
    );
    if (!pending) return NextResponse.json({ error: "Solicitud no encontrada o ya revisada" }, { status: 404 });

    let appliedEventId: string | null = null;
    if (body.status === "approved") {
      const events = await listAttendanceEvents(pending.businessDate);
      const employeeEvents = events.filter((event) => event.employeeId === pending.employeeId);
      if (nextAttendanceAction(employeeEvents) !== pending.type) {
        return NextResponse.json(
          { error: "La secuencia actual no permite aplicar esta corrección" },
          { status: 409 },
        );
      }
      const event = await createAttendanceEvent({
        requestId: `correction-${pending.id}`,
        employeeId: pending.employeeId,
        employeeName: pending.employeeName,
        type: pending.type,
        occurredAt: pending.occurredAt,
        businessDate: pending.businessDate,
        source: "admin",
        offline: false,
        deviceId: "attendance-correction",
      });
      appliedEventId = event.id;
    }
    const correction = await reviewAttendanceCorrection({
      id: pending.id,
      status: body.status,
      reviewedBy: user.name,
      reviewNote: body.note?.trim().slice(0, 500) || null,
      appliedEventId,
    });
    return correction
      ? NextResponse.json({ correction })
      : NextResponse.json({ error: "Solicitud ya revisada" }, { status: 409 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo revisar la solicitud" },
      { status: 503 },
    );
  }
}
