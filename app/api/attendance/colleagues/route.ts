import { NextRequest, NextResponse } from "next/server";
import { listAttendanceEvents } from "@/lib/attendance/repository";
import { attendanceBusinessDate } from "@/lib/attendance/time";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";
import { findKioskEmployee } from "@/lib/kiosk/employees";

type ColleagueAttendance = {
  employeeId: string;
  employeeName: string;
  department: string;
  lastType: "in" | "out" | null;
  lastTime: string | null;
};

type ColleaguesPayload = {
  businessDate: string;
  myDepartment: string;
  colleagues: ColleagueAttendance[];
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
    const myEmployee = findKioskEmployee(user.employeeId);
    if (!myEmployee) {
      return NextResponse.json(
        { error: "Empleado no encontrado" },
        { status: 404 },
      );
    }

    const businessDate = attendanceBusinessDate();
    const allEvents = await listAttendanceEvents(businessDate);

    const colleguesByDept = allEvents
      .filter((event) => event.employeeId !== myEmployee.id)
      .reduce((acc, event) => {
        const employee = findKioskEmployee(event.employeeId);
        if (!employee) return acc;

        // Solo mostrar compañeros del mismo departamento
        if (employee.department !== myEmployee.department) return acc;

        if (!acc[employee.id]) {
          acc[employee.id] = {
            employeeId: employee.id,
            employeeName: employee.name,
            department: employee.department,
            lastType: null,
            lastTime: null,
          };
        }

        const colleague = acc[employee.id];
        if (!colleague.lastTime || event.occurredAt > colleague.lastTime) {
          colleague.lastType = event.type;
          colleague.lastTime = event.occurredAt;
        }

        return acc;
      }, {} as Record<string, ColleagueAttendance>);

    const colleagues = Object.values(colleguesByDept).sort((a, b) =>
      a.employeeName.localeCompare(b.employeeName),
    );

    return NextResponse.json(
      {
        businessDate,
        myDepartment: myEmployee.department,
        colleagues,
      } as ColleaguesPayload,
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar la información",
      },
      { status: 503 },
    );
  }
}
