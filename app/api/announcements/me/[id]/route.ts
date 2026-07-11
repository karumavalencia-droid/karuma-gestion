import { NextRequest, NextResponse } from "next/server";
import {
  updateAnnouncement,
  deleteAnnouncement,
  listMyAnnouncements,
} from "@/lib/announcements/repository";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { findKioskEmployee } from "@/lib/kiosk/employees";

export async function PATCH(
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
  type PatchBody = { completed?: boolean; title?: string; description?: string; priority?: string };
  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { error: "Solicitud inválida" },
      { status: 400 },
    );
  }

  try {
    // Las cuentas de gestión pueden actualizar cualquier anuncio;
    // los empleados solo los suyos.
    if (user.employeeId) {
      const employee = findKioskEmployee(user.employeeId);
      if (!employee) {
        return NextResponse.json(
          { error: "Empleado no encontrado" },
          { status: 404 },
        );
      }

      const myAnnouncements = await listMyAnnouncements(employee.id);
      const announcement = myAnnouncements.find((a) => a.id === id);
      if (!announcement) {
        return NextResponse.json(
          { error: "Anuncio no encontrado o no tienes permiso" },
          { status: 404 },
        );
      }
    }

    type UpdateRecord = Record<string, boolean | string>;
    const update: UpdateRecord = {};
    if (typeof body.completed === "boolean") update.completed = body.completed;
    if (body.title) update.title = body.title.trim();
    if (body.description) update.description = body.description.trim();
    if (body.priority && ["low", "normal", "high"].includes(body.priority)) {
      update.priority = body.priority;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "No hay cambios que realizar" },
        { status: 400 },
      );
    }

    const updated = await updateAnnouncement(id, update as Record<string, boolean | string>);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el anuncio",
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
  try {
    // Las cuentas de gestión pueden eliminar cualquier anuncio;
    // los empleados solo los suyos.
    if (user.employeeId) {
      const employee = findKioskEmployee(user.employeeId);
      if (!employee) {
        return NextResponse.json(
          { error: "Empleado no encontrado" },
          { status: 404 },
        );
      }

      const myAnnouncements = await listMyAnnouncements(employee.id);
      const announcement = myAnnouncements.find((a) => a.id === id);
      if (!announcement) {
        return NextResponse.json(
          { error: "Anuncio no encontrado o no tienes permiso" },
          { status: 404 },
        );
      }
    }

    await deleteAnnouncement(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo eliminar el anuncio",
      },
      { status: 503 },
    );
  }
}
