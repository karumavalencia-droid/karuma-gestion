import { NextRequest, NextResponse } from "next/server";
import {
  listAllActiveAnnouncements,
  listAnnouncementsByDepartment,
  listMyAnnouncements,
  createAnnouncement,
  type AnnouncementWithReadStatus,
} from "@/lib/announcements/repository";
import { ADMIN_ANNOUNCEMENT_KEY } from "@/lib/announcements/constants";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { findKioskEmployee } from "@/lib/kiosk/employees";
import type { DbAnnouncementInsert } from "@/lib/supabase/types";

type AnnouncementsPayload = {
  myAnnouncements: AnnouncementWithReadStatus[];
  departmentAnnouncements: AnnouncementWithReadStatus[];
  isAdmin?: boolean;
};

export async function GET(request: NextRequest): Promise<NextResponse> {
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
    // Cuenta de gestión (sin empleado vinculado): ve los anuncios de todos los departamentos.
    if (!user.employeeId) {
      const [myAnnouncements, departmentAnnouncements] = await Promise.all([
        listMyAnnouncements(ADMIN_ANNOUNCEMENT_KEY),
        listAllActiveAnnouncements(ADMIN_ANNOUNCEMENT_KEY),
      ]);

      return NextResponse.json(
        {
          myAnnouncements,
          departmentAnnouncements,
          isAdmin: true,
        } as AnnouncementsPayload,
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    const employee = findKioskEmployee(user.employeeId);
    if (!employee) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 },
      );
    }

    const [myAnnouncements, departmentAnnouncements] = await Promise.all([
      listMyAnnouncements(employee.id),
      listAnnouncementsByDepartment(employee.department, employee.id),
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

export async function POST(request: NextRequest): Promise<NextResponse> {
  const user = await verifySessionToken(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );
  if (!user) {
    return NextResponse.json(
      { error: "Debes iniciar sesión" },
      { status: 401 },
    );
  }
  type PostBody = {
    title?: string;
    description?: string;
    priority?: string;
    department?: string;
  };
  let body: PostBody;
  try {
    body = (await request.json()) as PostBody;
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
    let employeeKey: string;
    let employeeName: string;
    let department: string;

    if (!user.employeeId) {
      // Cuenta de gestión: debe indicar a qué departamento va dirigido el anuncio.
      if (!body.department || !["Sala", "Cocina"].includes(body.department)) {
        return NextResponse.json(
          { error: "Selecciona el departamento del anuncio (Sala o Cocina)" },
          { status: 400 },
        );
      }
      employeeKey = ADMIN_ANNOUNCEMENT_KEY;
      employeeName = user.name;
      department = body.department;
    } else {
      const employee = findKioskEmployee(user.employeeId);
      if (!employee) {
        return NextResponse.json(
          { error: "Empleado no encontrado" },
          { status: 404 },
        );
      }
      employeeKey = employee.id;
      employeeName = employee.name;
      department = employee.department;
    }

    const announcement = await createAnnouncement({
      employee_key: employeeKey,
      employee_name: employeeName,
      department,
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
