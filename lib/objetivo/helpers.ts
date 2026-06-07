import { ObjetivoStore, RegistroDiario } from "@/lib/types";

export const STORAGE_KEY = "karuma_objetivo_100k_v1";
export const OBJETIVO_MENSUAL_DEFAULT = 100_000;

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function fmtNum(value: number, decimals = 2): number {
  return parseFloat(value.toFixed(decimals));
}

function seedRegistros(): RegistroDiario[] {
  return [
    {
      id: "resto-0605",
      fecha: "2026-06-05",
      facturacion: 3908.2,
      clientes: 153,
      ticketMedio: 25.46,
      bebidas: 586.23,
      observaciones: "Restosuite",
    },
    {
      id: "resto-0606",
      fecha: "2026-06-06",
      facturacion: 2687.15,
      clientes: 114,
      ticketMedio: 23.55,
      bebidas: 403.07,
      observaciones: "Restosuite",
    },
  ];
}

export function seedObjetivo(): ObjetivoStore {
  return {
    objetivoMensual: OBJETIVO_MENSUAL_DEFAULT,
    registros: seedRegistros(),
  };
}

function normalizeRegistro(raw: unknown): RegistroDiario | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const fecha = String(r.fecha ?? "").slice(0, 10);
  if (!fecha) return null;

  const facturacion = fmtNum(parseFloat(String(r.facturacion ?? 0)) || 0);
  const clientes = Math.max(0, parseInt(String(r.clientes ?? 0), 10) || 0);
  const ticketRaw = parseFloat(String(r.ticketMedio ?? 0)) || 0;
  const ticketMedio =
    ticketRaw > 0 ? fmtNum(ticketRaw) : clientes > 0 ? fmtNum(facturacion / clientes) : 0;

  return {
    id: String(r.id ?? genId()),
    fecha,
    facturacion,
    clientes,
    ticketMedio,
    bebidas: fmtNum(parseFloat(String(r.bebidas ?? 0)) || 0),
    observaciones: String(r.observaciones ?? ""),
  };
}

export function loadObjetivo(): ObjetivoStore {
  if (typeof window === "undefined") return seedObjetivo();

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedObjetivo();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const registros = Array.isArray(parsed.registros)
      ? parsed.registros
          .map(normalizeRegistro)
          .filter((r): r is RegistroDiario => r !== null)
      : [];

    const store: ObjetivoStore = {
      objetivoMensual:
        typeof parsed.objetivoMensual === "number" && parsed.objetivoMensual > 0
          ? parsed.objetivoMensual
          : OBJETIVO_MENSUAL_DEFAULT,
      registros: registros.length > 0 ? registros : seedRegistros(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return store;
  } catch {
    const seeded = seedObjetivo();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

export function saveObjetivo(store: ObjetivoStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getRegistrosMes(
  registros: RegistroDiario[],
  year: number,
  month: number,
): RegistroDiario[] {
  return registros
    .filter((r) => {
      const d = new Date(r.fecha + "T12:00:00");
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function diasEnMes(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function esFinDeSemana(fecha: string): boolean {
  const day = new Date(fecha + "T12:00:00").getDay();
  return day === 0 || day === 6;
}

export interface ObjetivoMetrics {
  objetivoMensual: number;
  facturacionActual: number;
  proyeccionMensual: number;
  diferenciaObjetivo: number;
  porcentajeCompletado: number;
  promedioDiario: number;
  promedioClientesDia: number;
  ticketMedioGlobal: number;
  clientesNecesariosPorDia: number;
  facturacionDiariaNecesaria: number;
  diasRestantes: number;
  diasConDatos: number;
  diasTranscurridos: number;
  probabilidadObjetivo: number;
  totalClientes: number;
  totalBebidas: number;
  ratioBebidas: number;
}

export function computeMetrics(
  store: ObjetivoStore,
  refDate: Date = new Date(),
): ObjetivoMetrics {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const mesRegistros = getRegistrosMes(store.registros, year, month);
  const totalDiasMes = diasEnMes(year, month);
  const diaActual = refDate.getDate();

  const facturacionActual = fmtNum(
    mesRegistros.reduce((s, r) => s + r.facturacion, 0),
  );
  const totalClientes = mesRegistros.reduce((s, r) => s + r.clientes, 0);
  const totalBebidas = fmtNum(mesRegistros.reduce((s, r) => s + r.bebidas, 0));
  const diasConDatos = mesRegistros.length;

  const promedioDiario =
    diasConDatos > 0 ? fmtNum(facturacionActual / diasConDatos) : 0;
  const promedioClientesDia =
    diasConDatos > 0 ? fmtNum(totalClientes / diasConDatos, 1) : 0;
  const ticketMedioGlobal =
    totalClientes > 0 ? fmtNum(facturacionActual / totalClientes) : 0;

  const proyeccionMensual = fmtNum(promedioDiario * totalDiasMes, 0);
  const diferenciaObjetivo = fmtNum(store.objetivoMensual - facturacionActual);
  const porcentajeCompletado = fmtNum(
    Math.min(100, (facturacionActual / store.objetivoMensual) * 100),
    1,
  );

  const diasRestantes = Math.max(0, totalDiasMes - diaActual);
  const pendiente = Math.max(0, store.objetivoMensual - facturacionActual);
  const facturacionDiariaNecesaria =
    diasRestantes > 0 ? fmtNum(pendiente / diasRestantes) : 0;

  const clientesRestantes =
    ticketMedioGlobal > 0 ? pendiente / ticketMedioGlobal : 0;
  const clientesNecesariosPorDia =
    diasRestantes > 0 && ticketMedioGlobal > 0
      ? fmtNum(clientesRestantes / diasRestantes, 1)
      : 0;

  const ratioProyeccion = proyeccionMensual / store.objetivoMensual;
  let probabilidadObjetivo: number;
  if (facturacionActual >= store.objetivoMensual) {
    probabilidadObjetivo = 100;
  } else if (ratioProyeccion >= 1) {
    probabilidadObjetivo = fmtNum(Math.min(95, 70 + (ratioProyeccion - 1) * 50), 0);
  } else if (ratioProyeccion >= 0.9) {
    probabilidadObjetivo = fmtNum(55 + (ratioProyeccion - 0.9) * 150, 0);
  } else {
    probabilidadObjetivo = fmtNum(Math.max(5, ratioProyeccion * 60), 0);
  }

  const ratioBebidas =
    facturacionActual > 0 ? fmtNum((totalBebidas / facturacionActual) * 100, 1) : 0;

  return {
    objetivoMensual: store.objetivoMensual,
    facturacionActual,
    proyeccionMensual,
    diferenciaObjetivo,
    porcentajeCompletado,
    promedioDiario,
    promedioClientesDia,
    ticketMedioGlobal,
    clientesNecesariosPorDia,
    facturacionDiariaNecesaria,
    diasRestantes,
    diasConDatos,
    diasTranscurridos: diaActual,
    probabilidadObjetivo,
    totalClientes,
    totalBebidas,
    ratioBebidas,
  };
}

export interface TendenciaSemanal {
  semana: string;
  facturacion: number;
  clientes: number;
  dias: number;
}

export function getTendenciaSemanal(
  registros: RegistroDiario[],
  year: number,
  month: number,
): TendenciaSemanal[] {
  const mes = getRegistrosMes(registros, year, month);
  const buckets: TendenciaSemanal[] = [
    { semana: "Sem. 1 (1-7)", facturacion: 0, clientes: 0, dias: 0 },
    { semana: "Sem. 2 (8-14)", facturacion: 0, clientes: 0, dias: 0 },
    { semana: "Sem. 3 (15-21)", facturacion: 0, clientes: 0, dias: 0 },
    { semana: "Sem. 4 (22+)", facturacion: 0, clientes: 0, dias: 0 },
  ];

  for (const r of mes) {
    const day = new Date(r.fecha + "T12:00:00").getDate();
    const idx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
    buckets[idx].facturacion += r.facturacion;
    buckets[idx].clientes += r.clientes;
    buckets[idx].dias += 1;
  }

  return buckets.map((b) => ({
    ...b,
    facturacion: fmtNum(b.facturacion),
  }));
}

export function getMejorPeorDia(registros: RegistroDiario[]): {
  mejor: RegistroDiario | null;
  peor: RegistroDiario | null;
} {
  if (registros.length === 0) return { mejor: null, peor: null };
  const sorted = [...registros].sort((a, b) => b.facturacion - a.facturacion);
  return { mejor: sorted[0], peor: sorted[sorted.length - 1] };
}

export interface SugerenciaAI {
  id: string;
  tipo: "success" | "warning" | "info" | "danger";
  titulo: string;
  mensaje: string;
}

export function generarSugerenciasAI(
  metrics: ObjetivoMetrics,
  registrosMes: RegistroDiario[],
): SugerenciaAI[] {
  const sugerencias: SugerenciaAI[] = [];

  if (metrics.proyeccionMensual >= metrics.objetivoMensual) {
    sugerencias.push({
      id: "objetivo-alcanzable",
      tipo: "success",
      titulo: "Objetivo alcanzable",
      mensaje: `Con la proyección actual de ${metrics.proyeccionMensual.toLocaleString("es-ES")} €, el local tiene un ${metrics.probabilidadObjetivo}% de probabilidad de superar los 100.000 € este mes.`,
    });
  } else {
    const falta = fmtNum(metrics.objetivoMensual - metrics.proyeccionMensual, 0);
    sugerencias.push({
      id: "objetivo-riesgo",
      tipo: "warning",
      titulo: "Riesgo de no alcanzar el objetivo",
      mensaje: `La proyección mensual (${metrics.proyeccionMensual.toLocaleString("es-ES")} €) está ${falta.toLocaleString("es-ES")} € por debajo del objetivo. Necesitas ${metrics.facturacionDiariaNecesaria.toLocaleString("es-ES")} €/día en los próximos ${metrics.diasRestantes} días.`,
    });
  }

  if (metrics.clientesNecesariosPorDia > 0) {
    const extra =
      metrics.clientesNecesariosPorDia - metrics.promedioClientesDia;
    sugerencias.push({
      id: "clientes-dia",
      tipo: extra > 10 ? "danger" : "info",
      titulo: "Clientes necesarios por día",
      mensaje:
        extra > 0
          ? `Faltan ~${fmtNum(extra, 0)} clientes/día respecto al ritmo actual (${metrics.promedioClientesDia} vs ${metrics.clientesNecesariosPorDia} necesarios).`
          : `El ritmo de clientes (${metrics.promedioClientesDia}/día) es suficiente si se mantiene el ticket medio.`,
    });
  }

  const ratioBebidasObjetivo = 18;
  if (metrics.ratioBebidas > 0 && metrics.ratioBebidas < ratioBebidasObjetivo) {
    sugerencias.push({
      id: "bebidas-bajas",
      tipo: "warning",
      titulo: "Potencial en bebidas",
      mensaje: `Las bebidas representan el ${metrics.ratioBebidas}% de la facturación (objetivo ~${ratioBebidasObjetivo}%). Impulsar upselling de sake, cerveza y refrescos puede aportar ${fmtNum((ratioBebidasObjetivo - metrics.ratioBebidas) * metrics.facturacionActual / 100, 0)} € extra.`,
    });
  } else if (metrics.ratioBebidas >= ratioBebidasObjetivo) {
    sugerencias.push({
      id: "bebidas-ok",
      tipo: "success",
      titulo: "Bebidas en buen nivel",
      mensaje: `El ratio de bebidas (${metrics.ratioBebidas}%) está en línea con el objetivo. Mantén las sugerencias en mesa.`,
    });
  }

  const finde = registrosMes.filter((r) => esFinDeSemana(r.fecha));
  const laborables = registrosMes.filter((r) => !esFinDeSemana(r.fecha));

  if (finde.length > 0 && laborables.length > 0) {
    const avgFinde =
      finde.reduce((s, r) => s + r.facturacion, 0) / finde.length;
    const avgLaborable =
      laborables.reduce((s, r) => s + r.facturacion, 0) / laborables.length;

    if (avgFinde < avgLaborable * 0.95) {
      sugerencias.push({
        id: "finde-bajo",
        tipo: "danger",
        titulo: "Fin de semana por debajo",
        mensaje: `La media de fin de semana (${fmtNum(avgFinde, 0)} €) está por debajo de entre semana (${fmtNum(avgLaborable, 0)} €). Refuerza reservas, menú especial o promos viernes-sábado.`,
      });
    } else {
      sugerencias.push({
        id: "finde-ok",
        tipo: "info",
        titulo: "Fin de semana en línea",
        mensaje: `El fin de semana factura ${fmtNum(avgFinde, 0)} €/día vs ${fmtNum(avgLaborable, 0)} € entre semana. Buen rendimiento.`,
      });
    }
  }

  return sugerencias;
}

export const EMPTY_REGISTRO_FORM = {
  fecha: new Date().toISOString().slice(0, 10),
  facturacion: "",
  clientes: "",
  ticketMedio: "",
  bebidas: "",
  observaciones: "",
};

export type RegistroForm = typeof EMPTY_REGISTRO_FORM;

export function registroToForm(r: RegistroDiario): RegistroForm {
  return {
    fecha: r.fecha,
    facturacion: String(r.facturacion),
    clientes: String(r.clientes),
    ticketMedio: String(r.ticketMedio),
    bebidas: String(r.bebidas),
    observaciones: r.observaciones,
  };
}

export function parseRegistroForm(form: RegistroForm): Omit<RegistroDiario, "id"> | null {
  const fecha = form.fecha.slice(0, 10);
  if (!fecha) return null;

  const facturacion = fmtNum(parseFloat(form.facturacion) || 0);
  const clientes = Math.max(0, parseInt(form.clientes, 10) || 0);
  if (facturacion <= 0) return null;

  const ticketParsed = parseFloat(form.ticketMedio);
  const ticketMedio =
    ticketParsed > 0
      ? fmtNum(ticketParsed)
      : clientes > 0
        ? fmtNum(facturacion / clientes)
        : 0;

  return {
    fecha,
    facturacion,
    clientes,
    ticketMedio,
    bebidas: fmtNum(parseFloat(form.bebidas) || 0),
    observaciones: form.observaciones.trim(),
  };
}
