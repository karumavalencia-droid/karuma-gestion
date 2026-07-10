import { NextRequest, NextResponse } from "next/server";
import {
  markAnnouncementAsRead,
  markAnnouncementAsUnread,
} from "@/lib/announcements/repository";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { findKioskEmployee } from "@/lib/kiosk/employees";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const user = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!user) {
    return NextResponse.json(
      { error: "Debes iniciar sesión" },
      { status: 401 },
    );
  }
  if (!user.employeeId) {
    return NextResponse.json(
      { error: "La cuenta no está vinculada a un empleado" },
      { status: 403 },
    );
  }

  try {
    const employee = findKioskEmployee(user.employeeId);
    if (!employee) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 },
      );
    }

    await markAnnouncementAsRead(id, employee.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo marcar como leído",
      },
      { status: 503 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const user = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!user) {
    return NextResponse.json(
      { error: "Debes iniciar sesión" },
      { status: 401 },
    );
  }
  if (!user.employeeId) {
    return NextResponse.json(
      { error: "La cuenta no está vinculada a un empleado" },
      { status: 403 },
    );
  }

  try {
    const employee = findKioskEmployee(user.employeeId);
    if (!employee) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 },
      );
    }

    await markAnnouncementAsUnread(id, employee.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo marcar como no leído",
      },
      { status: 503 },
    );
  }
}
