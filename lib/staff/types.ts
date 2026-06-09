import type { RestDayKey } from "./rest-days";
import type { StandardShift } from "./shifts";

export type StaffStatus = "在职" | "离职";

export type StaffDepartment = "Sala" | "Sushi" | "Hot Kitchen" | "Dishwasher";

export const STAFF_DEPARTMENTS: StaffDepartment[] = [
  "Sala",
  "Sushi",
  "Hot Kitchen",
  "Dishwasher",
];

export type StaffMember = {
  id: string;
  name: string;
  department: StaffDepartment;
  position: string;
  role: string;
  phone: string;
  email: string;
  hireDate: string;
  contractType: string;
  /** 合同工时；null 表示待确认 */
  weeklyHours: number | null;
  hourlyRate: number;
  status: StaffStatus;
  fixedRestDay1: RestDayKey | null;
  fixedRestDay2: RestDayKey | null;
  /** 标准班次；null 表示待确认 */
  fixedShift: StandardShift | null;
};

export type StaffInput = Omit<StaffMember, "id">;
