export type ShiftLogStatus = "Pendiente" | "En proceso" | "Completado";

export type ShiftLog = {
  id: string;
  date: string;
  shift: string;
  responsible: string;
  manager: string;
  staffCount: number;
  issues: string;
  stockShortage: string;
  equipmentIssues: string;
  customerComplaints: string;
  cashVariance: string;
  notes: string;
  status: ShiftLogStatus;
};

export const SHIFT_LOG_STATUS_STYLE: Record<ShiftLogStatus, string> = {
  Pendiente: "bg-amber-50 text-amber-700 ring-amber-600/20",
  "En proceso": "bg-blue-50 text-blue-700 ring-blue-600/20",
  Completado: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
};

export const SHIFT_LOG_STATUS_LABEL: Record<ShiftLogStatus, string> = {
  Pendiente: "Pendiente",
  "En proceso": "En proceso",
  Completado: "Completado",
};

export const SHIFT_LOG_SHIFT_LABEL: Record<string, string> = {
  Comida: "Comida",
  Cena: "Cena",
  "Día completo": "Día completo",
};

export const SHIFT_LOG_SEED: ShiftLog[] = [
  {
    id: "sl-001",
    date: "2026-06-07",
    shift: "Cena",
    responsible: "Maria",
    manager: "Zhou",
    staffCount: 12,
    issues: "Stock bajo de salmón",
    stockShortage: "Salmón, atún",
    equipmentIssues: "La puerta de la cámara falla a veces",
    customerComplaints: "Una queja de mesa a las 22:30",
    cashVariance: "Sin diferencia",
    notes: "Compras avisadas",
    status: "Pendiente",
  },
  {
    id: "sl-002",
    date: "2026-06-07",
    shift: "Comida",
    responsible: "Wang",
    manager: "Maria",
    staffCount: 10,
    issues: "Sin incidencias importantes",
    stockShortage: "Sin faltas",
    equipmentIssues: "",
    customerComplaints: "",
    cashVariance: "Sin diferencia",
    notes: "Servicio de comida normal",
    status: "Completado",
  },
  {
    id: "sl-003",
    date: "2026-06-06",
    shift: "Cena",
    responsible: "Laura",
    manager: "Maria",
    staffCount: 11,
    issues: "Equipo de sala algo justo",
    stockShortage: "Edamame",
    equipmentIssues: "Horno 2 con temperatura alta",
    customerComplaints: "",
    cashVariance: "-€3.50",
    notes: "Horario ajustado",
    status: "En proceso",
  },
  {
    id: "sl-004",
    date: "2026-06-05",
    shift: "Comida",
    responsible: "Ana",
    manager: "Maria",
    staffCount: 9,
    issues: "Sin incidencias",
    stockShortage: "",
    equipmentIssues: "",
    customerComplaints: "",
    cashVariance: "Sin diferencia",
    notes: "Todo correcto",
    status: "Completado",
  },
  {
    id: "sl-005",
    date: "2026-06-04",
    shift: "Cena",
    responsible: "Pedro",
    manager: "Maria",
    staffCount: 8,
    issues: "Agua acumulada en zona de lavado",
    stockShortage: "Sin faltas",
    equipmentIssues: "Lavavajillas drena lento",
    customerComplaints: "",
    cashVariance: "Sin diferencia",
    notes: "Incidencia comunicada",
    status: "Pendiente",
  },
];

export function isSameWeek(dateStr: string, ref: Date): boolean {
  const d = new Date(`${dateStr}T12:00:00`);
  const start = new Date(ref);
  start.setHours(0, 0, 0, 0);
  const day = start.getDay() || 7;
  start.setDate(start.getDate() - day + 1);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return d >= start && d <= end;
}

export function formatDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${Number(d)}/${Number(m)}/${y}`;
}
