import { NextRequest, NextResponse } from "next/server";
import {
  listAnnouncementsByDepartment,
  listMyAnnouncements,
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from "@/lib/announcements/repository";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { findKioskEmployee } from "@/lib/kiosk/employees";
import type { DbAnnouncement, DbAnnouncementInsert } from "@/lib/supabase/types";

type AnnouncementsPayload = {
  myAnnouncements: DbAnnouncement[];
  departmentAnnouncements: DbAnnouncement[];
};

export async function GET(request: NextRequest) {
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

    const [myAnnouncements, departmentAnnouncements] = await Promise.all([
      listMyAnnouncements(employee.id),
      listAnnouncementsByDepartment(employee.department),
    ]);

    return NextResponse.json(
      {
        myAnnouncements,
        departmentAnnouncements,
      } as AnnouncementsPayload,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar los anuncios",
      },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
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

  let body: { title?: string; description?: string; priority?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "Solicitud inválida" },
      { status: 400 },
    );
  }

  const title = body.title?.trim();
  const description = body.description?.trim();
  const priority = body.priority || "normal";

  if (!title || title.length === 0 || title.length > 200) {
    return NextResponse.json(
      { error: "El título es requerido y debe tener menos de 200 caracteres" },
      { status: 400 },
    );
  }

  if (!description || description.length === 0 || description.length > 1000) {
    return NextResponse.json(
      { error: "La descripción es requerida y debe tener menos de 1000 caracteres" },
      { status: 400 },
    );
  }

  if (!["low", "normal", "high"].includes(priority)) {
    return NextResponse.json(
      { error: "Prioridad inválida" },
      { status: 400 },
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

    const announcement = await createAnnouncement({
      employee_key: employee.id,
      employee_name: employee.name,
      department: employee.department,
      title,
      description,
      priority: priority as "low" | "normal" | "high",
    } as DbAnnouncementInsert);

    return NextResponse.json(announcement, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear el anuncio",
      },
      { status: 503 },
    );
  }
}
