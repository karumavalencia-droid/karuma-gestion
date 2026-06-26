import type { RestDayKey } from "./rest-days";
import type { StandardShift } from "./shifts";

export type StaffStatus = "Activo" | "Inactivo";

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
  /** Horas de contrato; null significa pendiente. */
  weeklyHours: number | null;
  hourlyRate: number;
  status: StaffStatus;
  fixedRestDay1: RestDayKey | null;
  fixedRestDay2: RestDayKey | null;
  /** Turno estándar; null significa pendiente. */
  fixedShift: StandardShift | null;
};

export type StaffInput = Omit<StaffMember, "id">;
