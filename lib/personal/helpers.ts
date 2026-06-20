import { empleados } from "@/lib/data/empleados";
import { turnos, diasSemana } from "@/lib/data/turnos";
import { DiaSemana, EmpleadoPersonal, EstadoEmpleado, HorarioDia } from "@/lib/types";

export const STORAGE_KEY = "karuma_staff_v1";
export const HORAS_MES_BASE = 160;
export const SEMANAS_MES = 4.33;

export const DIAS_SEMANA = diasSemana as DiaSemana[];

export const ESTADOS_EMPLEADO = [
  { value: "activo", label: "Activo" },
  { value: "vacaciones", label: "Vacaciones" },
  { value: "baja", label: "Baja" },
] as const;

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function emptyHorarioDia(): HorarioDia {
  return { turnoComida: "", turnoCena: "", horas: 0 };
}

export function emptyHorario(): Record<DiaSemana, HorarioDia> {
  return Object.fromEntries(DIAS_SEMANA.map((d) => [d, emptyHorarioDia()])) as Record<
    DiaSemana,
    HorarioDia
  >;
}

export function parseHorasRango(rango: string): number {
  const trimmed = rango.trim();
  if (!trimmed || trimmed === "—" || trimmed === "-") return 0;

  const match = trimmed.match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  if (!match) return 0;

  const toMinutes = (time: string) => {
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
  };

  const start = toMinutes(match[1]);
  let end = toMinutes(match[2]);
  if (end <= start) end += 24 * 60;

  return parseFloat(((end - start) / 60).toFixed(1));
}

export function calcularHorasDia(dia: HorarioDia): number {
  const comida = parseHorasRango(dia.turnoComida);
  const cena = parseHorasRango(dia.turnoCena);
  return parseFloat((comida + cena).toFixed(1));
}

export function actualizarHorasDia(dia: HorarioDia): HorarioDia {
  return { ...dia, horas: calcularHorasDia(dia) };
}

function nombreCoincide(turnoNombre: string, empNombre: string): boolean {
  const t = turnoNombre.toLowerCase();
  const e = empNombre.toLowerCase();
  return e.includes(t) || t.split(" ")[0] === e.split(" ")[0];
}

function buildHorarioFromTurnos(nombre: string): Record<DiaSemana, HorarioDia> {
  const horario = emptyHorario();

  for (const dia of DIAS_SEMANA) {
    const delDia = turnos.filter((t) => t.dia === dia && nombreCoincide(t.empleado, nombre));
    const comida = delDia.find((t) => {
      const h = parseInt(t.horaInicio.split(":")[0], 10);
      return h < 16;
    });
    const cena = delDia.find((t) => {
      const h = parseInt(t.horaInicio.split(":")[0], 10);
      return h >= 16;
    });

    const turnoComida = comida ? `${comida.horaInicio}-${comida.horaFin}` : "";
    const turnoCena = cena ? `${cena.horaInicio}-${cena.horaFin}` : "";
    horario[dia] = actualizarHorasDia({ turnoComida, turnoCena, horas: 0 });
  }

  return horario;
}

export function seedEmpleados(): EmpleadoPersonal[] {
  return empleados.map((e) => ({
    id: e.id,
    nombre: e.nombre,
    cargo: e.puesto,
    telefono: e.telefono,
    fechaAlta: e.fechaEntrada,
    salarioBase: e.sueldoEstimado > 0 ? e.sueldoEstimado : 1400,
    estado: e.estado,
    horario: buildHorarioFromTurnos(e.nombre),
  }));
}

function normalizeHorarioDia(raw: unknown): HorarioDia {
  if (!raw || typeof raw !== "object") return emptyHorarioDia();
  const r = raw as Record<string, unknown>;
  const dia: HorarioDia = {
    turnoComida: String(r.turnoComida ?? ""),
    turnoCena: String(r.turnoCena ?? ""),
    horas: 0,
  };
  return actualizarHorasDia(dia);
}

function normalizeHorario(raw: unknown): Record<DiaSemana, HorarioDia> {
  const base = emptyHorario();
  if (!raw || typeof raw !== "object") return base;

  const r = raw as Record<string, unknown>;
  for (const dia of DIAS_SEMANA) {
    base[dia] = normalizeHorarioDia(r[dia]);
  }
  return base;
}

function normalizeEmpleado(raw: unknown): EmpleadoPersonal | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const nombre = String(r.nombre ?? "").trim();
  if (!nombre) return null;

  const estado = r.estado === "vacaciones" || r.estado === "baja" ? r.estado : "activo";

  return {
    id: String(r.id ?? genId()),
    nombre,
    cargo: String(r.cargo ?? r.puesto ?? ""),
    telefono: String(r.telefono ?? ""),
    fechaAlta: String(r.fechaAlta ?? r.fechaEntrada ?? new Date().toISOString().slice(0, 10)),
    salarioBase: parseFloat(String(r.salarioBase ?? r.sueldoEstimado ?? 0)) || 0,
    estado,
    horario: normalizeHorario(r.horario),
  };
}

export function loadEmpleados(): EmpleadoPersonal[] {
  if (typeof window === "undefined") return seedEmpleados();

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedEmpleados();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return seedEmpleados();

    const empleadosData = parsed
      .map(normalizeEmpleado)
      .filter((e): e is EmpleadoPersonal => e !== null);

    if (empleadosData.length === 0) {
      const seeded = seedEmpleados();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(empleadosData));
    return empleadosData;
  } catch {
    const seeded = seedEmpleados();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

export function saveEmpleados(data: EmpleadoPersonal[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function horasSemana(emp: EmpleadoPersonal): number {
  if (emp.estado !== "activo") return 0;
  const total = DIAS_SEMANA.reduce((sum, dia) => sum + (emp.horario[dia]?.horas ?? 0), 0);
  return parseFloat(total.toFixed(1));
}

export function horasMes(emp: EmpleadoPersonal): number {
  if (emp.estado !== "activo") return 0;
  return parseFloat((horasSemana(emp) * SEMANAS_MES).toFixed(1));
}

export function horasExtra(emp: EmpleadoPersonal): number {
  const mes = horasMes(emp);
  return parseFloat(Math.max(0, mes - HORAS_MES_BASE).toFixed(1));
}

export interface NominaEmpleado {
  salarioBase: number;
  horasExtra: number;
  importeExtra: number;
  totalEstimado: number;
}

export function calcularNomina(emp: EmpleadoPersonal): NominaEmpleado {
  if (emp.estado !== "activo" || emp.salarioBase <= 0) {
    return { salarioBase: 0, horasExtra: 0, importeExtra: 0, totalEstimado: 0 };
  }

  const extra = horasExtra(emp);
  const tarifaHora = emp.salarioBase / HORAS_MES_BASE;
  const importeExtra = parseFloat((extra * tarifaHora * 1.5).toFixed(2));

  return {
    salarioBase: emp.salarioBase,
    horasExtra: extra,
    importeExtra,
    totalEstimado: parseFloat((emp.salarioBase + importeExtra).toFixed(2)),
  };
}

export function computeStats(empleadosData: EmpleadoPersonal[]) {
  const activos = empleadosData.filter((e) => e.estado === "activo").length;
  const horasSemanaTotal = parseFloat(
    empleadosData.reduce((sum, e) => sum + horasSemana(e), 0).toFixed(1),
  );
  const nominaTotal = parseFloat(
    empleadosData.reduce((sum, e) => sum + calcularNomina(e).totalEstimado, 0).toFixed(2),
  );

  return { activos, horasSemanaTotal, nominaTotal };
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportEmpleadosCsv(empleadosData: EmpleadoPersonal[]): void {
  const header = [
    "Nombre",
    "Cargo",
    "Teléfono",
    "Fecha de alta",
    "Salario base",
    "Estado",
    "Horas semana",
    "Horas mes",
    "Horas extra",
    "Total estimado",
  ];

  const rows = empleadosData.map((e) => {
    const nomina = calcularNomina(e);
    return [
      `"${e.nombre.replace(/"/g, '""')}"`,
      `"${e.cargo.replace(/"/g, '""')}"`,
      `"${e.telefono.replace(/"/g, '""')}"`,
      `"${e.fechaAlta}"`,
      e.salarioBase.toFixed(2),
      `"${e.estado}"`,
      horasSemana(e),
      horasMes(e),
      nomina.horasExtra,
      nomina.totalEstimado.toFixed(2),
    ];
  });

  downloadCsv([header, ...rows].map((r) => r.join(",")).join("\n"), "karuma_personal.csv");
}

export const EMPTY_FORM: {
  nombre: string;
  cargo: string;
  telefono: string;
  fechaAlta: string;
  salarioBase: string;
  estado: EstadoEmpleado;
} = {
  nombre: "",
  cargo: "",
  telefono: "",
  fechaAlta: new Date().toISOString().slice(0, 10),
  salarioBase: "",
  estado: "activo",
};

export type EmpleadoForm = typeof EMPTY_FORM;

export function empleadoToForm(emp: EmpleadoPersonal): EmpleadoForm {
  return {
    nombre: emp.nombre,
    cargo: emp.cargo,
    telefono: emp.telefono,
    fechaAlta: emp.fechaAlta,
    salarioBase: String(emp.salarioBase),
    estado: emp.estado,
  };
}

export function parseForm(
  form: EmpleadoForm,
): Omit<EmpleadoPersonal, "id" | "horario"> | null {
  const nombre = form.nombre.trim();
  const cargo = form.cargo.trim();
  if (!nombre || !cargo) return null;

  return {
    nombre,
    cargo,
    telefono: form.telefono.trim(),
    fechaAlta: form.fechaAlta,
    salarioBase: parseFloat(form.salarioBase) || 0,
    estado: form.estado,
  };
}
