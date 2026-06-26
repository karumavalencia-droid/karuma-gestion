import type { ShiftType } from "@/lib/schedule/shifts";

export interface ScheduleRow {
  id: string;
  empleado: string;
  fecha: string;
  turno: ShiftType;
  puesto: string;
}

export const scheduleRows: ScheduleRow[] = [
  {
    id: "sch1",
    empleado: "María García",
    fecha: "2026-06-07",
    turno: "full",
    puesto: "Sala",
  },
  {
    id: "sch2",
    empleado: "Wei Lin",
    fecha: "2026-06-07",
    turno: "lunch",
    puesto: "Cocina",
  },
  {
    id: "sch3",
    empleado: "Carlos Ruiz",
    fecha: "2026-06-07",
    turno: "evening",
    puesto: "Sala",
  },
  {
    id: "sch4",
    empleado: "Ana López",
    fecha: "2026-06-08",
    turno: "rest",
    puesto: "Caja",
  },
  {
    id: "sch5",
    empleado: "Carlos Ruiz",
    fecha: "2026-06-08",
    turno: "leave",
    puesto: "Sala",
  },
];
