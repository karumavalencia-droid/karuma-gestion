import { STAFF_MEMBERS } from "@/lib/staff/data";

export type KioskDepartment = "Sala" | "Cocina";

export type KioskEmployee = {
  id: string;
  name: string;
  department: KioskDepartment;
};

export const KIOSK_DEPARTMENTS: {
  id: KioskDepartment;
  titleZh: string;
  titleEs: string;
  subtitleZh: string;
  subtitleEs: string;
}[] = [
  {
    id: "Sala",
    titleZh: "Sala",
    titleEs: "Sala",
    subtitleZh: "Sala",
    subtitleEs: "Sala",
  },
  {
    id: "Cocina",
    titleZh: "Cocina",
    titleEs: "Cocina",
    subtitleZh: "Cocina",
    subtitleEs: "Cocina",
  },
];

export const KIOSK_EMPLOYEES: KioskEmployee[] = STAFF_MEMBERS
  .filter((employee) => employee.status === "Activo")
  .map((employee) => ({
    id: employee.id,
    name: employee.name,
    department: employee.department === "Sala" ? "Sala" : "Cocina",
  }));

export function findKioskEmployee(id: string): KioskEmployee | undefined {
  return KIOSK_EMPLOYEES.find((e) => e.id === id);
}

export function employeesByDepartment(dept: KioskDepartment): KioskEmployee[] {
  return KIOSK_EMPLOYEES.filter((e) => e.department === dept);
}
