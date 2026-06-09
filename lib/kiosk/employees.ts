export type KioskDepartment = "Sala" | "Cocina";

export type KioskEmployee = {
  id: string;
  name: string;
  department: KioskDepartment;
  pin: string;
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
    subtitleZh: "服务员",
    subtitleEs: "Sala",
  },
  {
    id: "Cocina",
    titleZh: "Cocina",
    titleEs: "Cocina",
    subtitleZh: "厨房",
    subtitleEs: "Cocina",
  },
];

export const KIOSK_EMPLOYEES: KioskEmployee[] = [
  { id: "jhoan", name: "Jhoan", department: "Sala", pin: "1001" },
  { id: "isabel", name: "Isabel", department: "Sala", pin: "1002" },
  { id: "celeste", name: "Celeste", department: "Sala", pin: "1003" },
  { id: "edu", name: "Edu", department: "Sala", pin: "1004" },
  { id: "jeferson", name: "Jeferson", department: "Cocina", pin: "2001" },
  { id: "newton", name: "Newton", department: "Cocina", pin: "2002" },
  {
    id: "sebastian-rodriguez",
    name: "Sebastian Rodriguez",
    department: "Cocina",
    pin: "2003",
  },
  { id: "sebastian-gomez", name: "Sebastian Gomez", department: "Cocina", pin: "2004" },
  { id: "hoscar", name: "Hoscar", department: "Cocina", pin: "2005" },
  { id: "junfeng", name: "Junfeng", department: "Cocina", pin: "2006" },
  { id: "mauricio", name: "Mauricio", department: "Cocina", pin: "2007" },
  { id: "alex", name: "Alex", department: "Cocina", pin: "2008" },
  { id: "karina", name: "Karina", department: "Cocina", pin: "2009" },
];

export function findKioskEmployee(id: string): KioskEmployee | undefined {
  return KIOSK_EMPLOYEES.find((e) => e.id === id);
}

export function employeesByDepartment(dept: KioskDepartment): KioskEmployee[] {
  return KIOSK_EMPLOYEES.filter((e) => e.department === dept);
}
