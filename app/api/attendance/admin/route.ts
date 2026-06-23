import { NextRequest, NextResponse } from "next/server";
import { listAttendanceEvents } from "@/lib/attendance/repository";
import { buildAttendanceDayReport } from "@/lib/attendance/rules";
import { attendanceBusinessDate } from "@/lib/attendance/time";
import { KIOSK_EMPLOYEES } from "@/lib/kiosk/employees";

export async function GET(request: NextRequest) {
  const requestedDate = request.nextUrl.searchParams.get("date");
  const date =
    requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
      ? requestedDate
      : attendanceBusinessDate();
  try {
    const events = await listAttendanceEvents(date);
    return NextResponse.json(
      buildAttendanceDayReport(KIOSK_EMPLOYEES, date, events),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo cargar la asistencia",
      },
      { status: 503 },
    );
  }
}
