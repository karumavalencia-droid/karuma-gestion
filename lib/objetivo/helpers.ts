import { RegistroRestosuite, RestosuiteStore } from "@/lib/types";

export const STORAGE_KEY = "karuma_restosuite_kpi_v1";
export const LEGACY_STORAGE_KEY = "karuma_objetivo_100k_v1";
export const OBJETIVO_MENSUAL_DEFAULT = 100_000;

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function fmtNum(value: number, decimals = 2): number {
  return parseFloat(value.toFixed(decimals));
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function daysBetween(start: string, end: string): string[] {
  const out: string[] = [];
  let cur = start;
  while (cur <= end) {
    out.push(cur);
    cur = addDays(cur, 1);
  }
  return out;
}

function generateSeedRegistros(): RegistroRestosuite[] {
  const jun5Ventas = 3908.2;
  const jun5Clientes = 153;
  const jun5Facturas = 64;
  const jun6Ventas = 2687.15;
  const jun6Clientes = 114;
  const jun6Facturas = 53;

  const totalVentas = 71734.55;
  const totalClientes = 3068;

  const remainingVentas = fmtNum(totalVentas - jun5Ventas - jun6Ventas);
  const remainingClientes = totalClientes - jun5Clientes - jun6Clientes;

  const diasIntermedios = daysBetween("2026-05-07", "2026-06-04");
  const n = diasIntermedios.length;

  const ventasDia = remainingVentas / n;
  const clientesDia = remainingClientes / n;

  const records: RegistroRestosuite[] = [];
  let ventasAcum = 0;
  let clientesAcum = 0;

  for (let i = 0; i < diasIntermedios.length; i++) {
    const fecha = diasIntermedios[i];
    const isLast = i === diasIntermedios.length - 1;
    const ventas = isLast
      ? fmtNum(remainingVentas - ventasAcum)
      : fmtNum(ventasDia);
    const clientes = isLast
      ? remainingClientes - clientesAcum
      : Math.round(clientesDia);
    ventasAcum += ventas;
    clientesAcum += clientes;

    records.push({
      id: `rs-${fecha}`,
      fecha,
      ventas,
      clientes,
      ticketMedio: clientes > 0 ? fmtNum(ventas / clientes) : 23.24,
      facturas: Math.max(1, Math.round((clientes / 2.35))),
      ventasBebida: fmtNum(ventas * 0.15),
      observaciones: "Restosuite",
    });
  }

  records.push({
    id: "rs-2026-06-05",
    fecha: "2026-06-05",
    ventas: jun5Ventas,
    clientes: jun5Clientes,
    ticketMedio: 25.46,
    facturas: jun5Facturas,
    ventasBebida: fmtNum(jun5Ventas * 0.15),
    observaciones: "Restosuite",
  });

  records.push({
    id: "rs-2026-06-06",
    fecha: "2026-06-06",
    ventas: jun6Ventas,
    clientes: jun6Clientes,
    ticketMedio: 23.55,
    facturas: jun6Facturas,
    ventasBebida: fmtNum(jun6Ventas * 0.15),
    observaciones: "Restosuite",
  });

  return records.sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function seedRestosuite(): RestosuiteStore {
  return {
    objetivoMensual: OBJETIVO_MENSUAL_DEFAULT,
    registros: generateSeedRegistros(),
  };
}

function normalizeRegistro(raw: unknown): RegistroRestosuite | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const fecha = String(r.fecha ?? "").slice(0, 10);
  if (!fecha) return null;

  const ventas = fmtNum(
    parseFloat(String(r.ventas ?? r.facturacion ?? 0)) || 0,
  );
  const clientes = Math.max(0, parseInt(String(r.clientes ?? 0), 10) || 0);
  const ticketRaw = parseFloat(String(r.ticketMedio ?? 0)) || 0;
  const ticketMedio =
    ticketRaw > 0 ? fmtNum(ticketRaw) : clientes > 0 ? fmtNum(ventas / clientes) : 0;

  return {
    id: String(r.id ?? genId()),
    fecha,
    ventas,
    clientes,
    ticketMedio,
    facturas: Math.max(0, parseInt(String(r.facturas ?? 0), 10) || 0),
    ventasBebida: fmtNum(
      parseFloat(String(r.ventasBebida ?? r.bebidas ?? 0)) || 0,
    ),
    observaciones: String(r.observaciones ?? ""),
  };
}

function migrateLegacyStore(raw: string): RestosuiteStore | null {
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const registros = Array.isArray(parsed.registros)
      ? parsed.registros
          .map(normalizeRegistro)
          .filter((r): r is RegistroRestosuite => r !== null)
      : [];
    if (registros.length === 0) return null;
    return {
      objetivoMensual:
        typeof parsed.objetivoMensual === "number" && parsed.objetivoMensual > 0
          ? parsed.objetivoMensual
          : OBJETIVO_MENSUAL_DEFAULT,
      registros,
    };
  } catch {
    return null;
  }
}

export function loadRestosuite(): RestosuiteStore {
  if (typeof window === "undefined") return seedRestosuite();

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) {
      const migrated = migrateLegacyStore(legacy);
      if (migrated) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        return migrated;
      }
    }
    const seeded = seedRestosuite();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const registros = Array.isArray(parsed.registros)
      ? parsed.registros
          .map(normalizeRegistro)
          .filter((r): r is RegistroRestosuite => r !== null)
      : [];

    const store: RestosuiteStore = {
      objetivoMensual:
        typeof parsed.objetivoMensual === "number" && parsed.objetivoMensual > 0
          ? parsed.objetivoMensual
          : OBJETIVO_MENSUAL_DEFAULT,
      registros: registros.length > 0 ? registros : generateSeedRegistros(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return store;
  } catch {
    const seeded = seedRestosuite();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

export function saveRestosuite(store: RestosuiteStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

/** @deprecated Usar loadRestosuite */
export const loadObjetivo = loadRestosuite;

/** @deprecated Usar saveRestosuite */
export const saveObjetivo = saveRestosuite;

export function getRegistrosMes(
  registros: RegistroRestosuite[],
  year: number,
  month: number,
): RegistroRestosuite[] {
  return registros
    .filter((r) => {
      const d = new Date(r.fecha + "T12:00:00");
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
}

export function getRegistrosPeriodo(
  registros: RegistroRestosuite[],
  desde: string,
  hasta: string,
): RegistroRestosuite[] {
  return registros.filter((r) => r.fecha >= desde && r.fecha <= hasta);
}

export function diasEnMes(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function esFinDeSemana(fecha: string): boolean {
  const day = new Date(fecha + "T12:00:00").getDay();
  return day === 0 || day === 6;
}

export interface RestosuiteMetrics {
  objetivoMensual: number;
  ventasActuales: number;
  clientesActuales: number;
  ticketMedioReal: number;
  promedioDiario: number;
  promedioClientesDia: number;
  proyeccionMensual: number;
  diferenciaObjetivo: number;
  porcentajeCompletado: number;
  ventasDiariasNecesarias: number;
  clientesNecesariosPorDia: number;
  probabilidadObjetivo: number;
  diasRestantes: number;
  diasConDatos: number;
  totalFacturas: number;
  totalVentasBebida: number;
  ratioBebidas: number;
  promedioFacturasDia: number;
}

export function computeMetrics(
  store: RestosuiteStore,
  refDate: Date = new Date(),
): RestosuiteMetrics {
  const year = refDate.getFullYear();
  const month = refDate.getMonth();
  const mesRegistros = getRegistrosMes(store.registros, year, month);
  const totalDiasMes = diasEnMes(year, month);
  const diaActual = refDate.getDate();

  const ventasActuales = fmtNum(mesRegistros.reduce((s, r) => s + r.ventas, 0));
  const clientesActuales = mesRegistros.reduce((s, r) => s + r.clientes, 0);
  const totalFacturas = mesRegistros.reduce((s, r) => s + r.facturas, 0);
  const totalVentasBebida = fmtNum(
    mesRegistros.reduce((s, r) => s + r.ventasBebida, 0),
  );
  const diasConDatos = mesRegistros.length;

  const ticketMedioReal =
    clientesActuales > 0 ? fmtNum(ventasActuales / clientesActuales) : 0;
  const promedioDiario =
    diasConDatos > 0 ? fmtNum(ventasActuales / diasConDatos) : 0;
  const promedioClientesDia =
    diasConDatos > 0 ? fmtNum(clientesActuales / diasConDatos, 1) : 0;
  const promedioFacturasDia =
    diasConDatos > 0 ? fmtNum(totalFacturas / diasConDatos, 1) : 0;

  const proyeccionMensual = fmtNum(promedioDiario * totalDiasMes, 0);
  const diferenciaObjetivo = fmtNum(store.objetivoMensual - ventasActuales);
  const porcentajeCompletado = fmtNum(
    Math.min(100, (ventasActuales / store.objetivoMensual) * 100),
    1,
  );

  const diasRestantes = Math.max(0, totalDiasMes - diaActual);
  const pendiente = Math.max(0, store.objetivoMensual - ventasActuales);
  const ventasDiariasNecesarias =
    diasRestantes > 0 ? fmtNum(pendiente / diasRestantes) : 0;

  const clientesRestantes =
    ticketMedioReal > 0 ? pendiente / ticketMedioReal : 0;
  const clientesNecesariosPorDia =
    diasRestantes > 0 && ticketMedioReal > 0
      ? fmtNum(clientesRestantes / diasRestantes, 1)
      : 0;

  const ratioProyeccion = proyeccionMensual / store.objetivoMensual;
  let probabilidadObjetivo: number;
  if (ventasActuales >= store.objetivoMensual) {
    probabilidadObjetivo = 100;
  } else if (ratioProyeccion >= 1) {
    probabilidadObjetivo = fmtNum(Math.min(95, 70 + (ratioProyeccion - 1) * 50), 0);
  } else if (ratioProyeccion >= 0.9) {
    probabilidadObjetivo = fmtNum(55 + (ratioProyeccion - 0.9) * 150, 0);
  } else {
    probabilidadObjetivo = fmtNum(Math.max(5, ratioProyeccion * 60), 0);
  }

  const ratioBebidas =
    ventasActuales > 0 ? fmtNum((totalVentasBebida / ventasActuales) * 100, 1) : 0;

  return {
    objetivoMensual: store.objetivoMensual,
    ventasActuales,
    clientesActuales,
    ticketMedioReal,
    promedioDiario,
    promedioClientesDia,
    proyeccionMensual,
    diferenciaObjetivo,
    porcentajeCompletado,
    ventasDiariasNecesarias,
    clientesNecesariosPorDia,
    probabilidadObjetivo,
    diasRestantes,
    diasConDatos,
    totalFacturas,
    totalVentasBebida,
    ratioBebidas,
    promedioFacturasDia,
  };
}

/** @deprecated Usar RestosuiteMetrics */
export type ObjetivoMetrics = RestosuiteMetrics;

export interface TendenciaSemanal {
  semana: string;
  ventas: number;
  clientes: number;
  dias: number;
}

export function getTendenciaSemanal(
  registros: RegistroRestosuite[],
  year: number,
  month: number,
): TendenciaSemanal[] {
  const mes = getRegistrosMes(registros, year, month);
  const buckets: TendenciaSemanal[] = [
    { semana: "Sem. 1 (1-7)", ventas: 0, clientes: 0, dias: 0 },
    { semana: "Sem. 2 (8-14)", ventas: 0, clientes: 0, dias: 0 },
    { semana: "Sem. 3 (15-21)", ventas: 0, clientes: 0, dias: 0 },
    { semana: "Sem. 4 (22+)", ventas: 0, clientes: 0, dias: 0 },
  ];

  for (const r of mes) {
    const day = new Date(r.fecha + "T12:00:00").getDate();
    const idx = day <= 7 ? 0 : day <= 14 ? 1 : day <= 21 ? 2 : 3;
    buckets[idx].ventas += r.ventas;
    buckets[idx].clientes += r.clientes;
    buckets[idx].dias += 1;
  }

  return buckets.map((b) => ({
    ...b,
    ventas: fmtNum(b.ventas),
  }));
}

export function getMejorPeorDia(registros: RegistroRestosuite[]): {
  mejor: RegistroRestosuite | null;
  peor: RegistroRestosuite | null;
} {
  if (registros.length === 0) return { mejor: null, peor: null };
  const sorted = [...registros].sort((a, b) => b.ventas - a.ventas);
  return { mejor: sorted[0], peor: sorted[sorted.length - 1] };
}

export interface SugerenciaAI {
  id: string;
  tipo: "success" | "warning" | "info" | "danger";
  titulo: string;
  mensaje: string;
}

export function generarSugerenciasAI(
  metrics: RestosuiteMetrics,
  registrosMes: RegistroRestosuite[],
): SugerenciaAI[] {
  const sugerencias: SugerenciaAI[] = [];

  if (metrics.proyeccionMensual >= metrics.objetivoMensual) {
    sugerencias.push({
      id: "objetivo-alcanzable",
      tipo: "success",
      titulo: "Objetivo 100.000 € alcanzable",
      mensaje: `Según Restosuite, la proyección mensual es de ${metrics.proyeccionMensual.toLocaleString("es-ES")} € con un ${metrics.probabilidadObjetivo}% de probabilidad de superar el objetivo.`,
    });
  } else {
    const falta = fmtNum(metrics.objetivoMensual - metrics.proyeccionMensual, 0);
    sugerencias.push({
      id: "objetivo-riesgo",
      tipo: "warning",
      titulo: "Riesgo de no alcanzar 100.000 €",
      mensaje: `Ventas actuales: ${metrics.ventasActuales.toLocaleString("es-ES")} €. La proyección (${metrics.proyeccionMensual.toLocaleString("es-ES")} €) está ${falta.toLocaleString("es-ES")} € por debajo. Necesitas ${metrics.ventasDiariasNecesarias.toLocaleString("es-ES")} €/día durante ${metrics.diasRestantes} días.`,
    });
  }

  const extraClientes = metrics.clientesNecesariosPorDia - metrics.promedioClientesDia;
  sugerencias.push({
    id: "clientes-dia",
    tipo: extraClientes > 15 ? "danger" : extraClientes > 5 ? "warning" : "info",
    titulo: "Clientes necesarios por día",
    mensaje:
      extraClientes > 0
        ? `Ritmo actual: ${metrics.promedioClientesDia} clientes/día. Para el objetivo necesitas ${metrics.clientesNecesariosPorDia}/día — faltan ~${fmtNum(extraClientes, 0)} clientes diarios extra.`
        : `Con ${metrics.promedioClientesDia} clientes/día y ticket de ${metrics.ticketMedioReal.toLocaleString("es-ES")} € el ritmo es suficiente.`,
  });

  const ratioBebidasObjetivo = 18;
  if (metrics.ratioBebidas > 0 && metrics.ratioBebidas < ratioBebidasObjetivo) {
    sugerencias.push({
      id: "bebidas-bajas",
      tipo: "warning",
      titulo: "Incrementar ventas de bebida",
      mensaje: `Ventas bebida: ${metrics.totalVentasBebida.toLocaleString("es-ES")} € (${metrics.ratioBebidas}% del total). Objetivo ~${ratioBebidasObjetivo}%. Formación en upselling de sake, vinos y cervezas premium.`,
    });
  } else if (metrics.ratioBebidas >= ratioBebidasObjetivo) {
    sugerencias.push({
      id: "bebidas-ok",
      tipo: "success",
      titulo: "Ventas bebida en buen nivel",
      mensaje: `El ${metrics.ratioBebidas}% de ventas proviene de bebidas. Mantén las recomendaciones en mesa.`,
    });
  }

  if (registrosMes.length >= 2) {
    const avgClientesPorFactura =
      metrics.totalFacturas > 0
        ? fmtNum(metrics.clientesActuales / metrics.totalFacturas, 2)
        : 0;
    if (avgClientesPorFactura > 2.5) {
      sugerencias.push({
        id: "facturas-mesas",
        tipo: "info",
        titulo: "Optimizar rotación de mesas",
        mensaje: `Media de ${avgClientesPorFactura} clientes/factura. Revisar tiempos de servicio para aumentar rotación sin perder ticket medio (${metrics.ticketMedioReal.toLocaleString("es-ES")} €).`,
      });
    }
  }

  const finde = registrosMes.filter((r) => esFinDeSemana(r.fecha));
  const laborables = registrosMes.filter((r) => !esFinDeSemana(r.fecha));

  if (finde.length > 0 && laborables.length > 0) {
    const avgFinde = finde.reduce((s, r) => s + r.ventas, 0) / finde.length;
    const avgLaborable = laborables.reduce((s, r) => s + r.ventas, 0) / laborables.length;

    if (avgFinde < avgLaborable * 0.95) {
      sugerencias.push({
        id: "finde-bajo",
        tipo: "danger",
        titulo: "Fin de semana por debajo de lo esperado",
        mensaje: `Media fin de semana: ${fmtNum(avgFinde, 0)} €/día vs ${fmtNum(avgLaborable, 0)} € entre semana. Activa promos, menú especial o refuerzo de personal.`,
      });
    } else {
      sugerencias.push({
        id: "finde-ok",
        tipo: "info",
        titulo: "Fin de semana en línea",
        mensaje: `Fin de semana: ${fmtNum(avgFinde, 0)} €/día · Entre semana: ${fmtNum(avgLaborable, 0)} €/día.`,
      });
    }
  }

  if (registrosMes.length >= 2) {
    const ultimos = [...registrosMes].slice(-2);
    const tendencia = ultimos[1].ventas - ultimos[0].ventas;
    if (tendencia < 0) {
      sugerencias.push({
        id: "tendencia-bajista",
        tipo: "warning",
        titulo: "Tendencia bajista reciente",
        mensaje: `Las ventas cayeron de ${ultimos[0].ventas.toLocaleString("es-ES")} € (${ultimos[0].fecha}) a ${ultimos[1].ventas.toLocaleString("es-ES")} € (${ultimos[1].fecha}). Analiza causas: clima, competencia o staffing.`,
      });
    }
  }

  return sugerencias;
}

export const EMPTY_REGISTRO_FORM = {
  fecha: new Date().toISOString().slice(0, 10),
  ventas: "",
  clientes: "",
  ticketMedio: "",
  facturas: "",
  ventasBebida: "",
  observaciones: "",
};

export type RegistroForm = typeof EMPTY_REGISTRO_FORM;

export function registroToForm(r: RegistroRestosuite): RegistroForm {
  return {
    fecha: r.fecha,
    ventas: String(r.ventas),
    clientes: String(r.clientes),
    ticketMedio: String(r.ticketMedio),
    facturas: String(r.facturas),
    ventasBebida: String(r.ventasBebida),
    observaciones: r.observaciones,
  };
}

export function parseRegistroForm(
  form: RegistroForm,
): Omit<RegistroRestosuite, "id"> | null {
  const fecha = form.fecha.slice(0, 10);
  if (!fecha) return null;

  const ventas = fmtNum(parseFloat(form.ventas) || 0);
  const clientes = Math.max(0, parseInt(form.clientes, 10) || 0);
  if (ventas <= 0) return null;

  const ticketParsed = parseFloat(form.ticketMedio);
  const ticketMedio =
    ticketParsed > 0
      ? fmtNum(ticketParsed)
      : clientes > 0
        ? fmtNum(ventas / clientes)
        : 0;

  return {
    fecha,
    ventas,
    clientes,
    ticketMedio,
    facturas: Math.max(0, parseInt(form.facturas, 10) || 0),
    ventasBebida: fmtNum(parseFloat(form.ventasBebida) || 0),
    observaciones: form.observaciones.trim(),
  };
}

export function computePeriodoResumen(
  registros: RegistroRestosuite[],
  desde: string,
  hasta: string,
) {
  const periodo = getRegistrosPeriodo(registros, desde, hasta);
  const ventas = fmtNum(periodo.reduce((s, r) => s + r.ventas, 0));
  const clientes = periodo.reduce((s, r) => s + r.clientes, 0);
  const ticketMedio = clientes > 0 ? fmtNum(ventas / clientes) : 0;
  return { ventas, clientes, ticketMedio, dias: periodo.length };
}
