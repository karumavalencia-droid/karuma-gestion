import { getAttendancePin } from "./employee-pins";

export function getEnvironmentAttendancePin(employeeId: string): string | null {
  return getAttendancePin(employeeId);
}
