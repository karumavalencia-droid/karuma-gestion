export const OBJETIVO_VENTAS = 100_000;

export const STORAGE_KEYS = {
  restosuite: "karuma_restosuite_kpi_v1",
  profit: "karuma_profit_v1",
  reviews: "karuma_reviews_v1",
  inventario: ["karuma_inventario_v2", "karuma_inventario_v1"],
  personal: "karuma_personal_v1",
} as const;

export interface PrioridadHoy {
  id: string;
  titulo: string;
  descripcion: string;
  urgencia: "alta" | "media" | "baja";
  activa: boolean;
}

export interface CeoDashboard {
  ventasHoy: number;
  clientesHoy: number;
  ventasMes: number;
  objetivo100k: number;
  progreso100kPct: number;
  falta100k: number;
  proyeccionMensual: number;
  beneficioEstimado: number;
  margenNetoPct: number;
  clientesMes: number;
  ticketMedio: number;
  googleRating: number;
  reviewsActuales: number;
  stockBajo: number;
  costePersonalPct: number;
  comprasMes: number;
  personalMes: number;
  resumenEjecutivo: string;
  prioridades: PrioridadHoy[];
  usandoDatosReales: boolean;
  fuentes: string[];
}

const SEED = {
  ventasMes: 71_734.55,
  clientesMes: 3_068,
  ticketMedio: 23.24,
  rating: 4.9,
  reviews: 431,
  personal: 27_000,
  alquiler: 7_000,
  compras: 18_000,
  suministros: 650,
  gestoria: 400,
  otros: 2_500,
  ventasBebidaRatio: 0.15,
};

export function fmtNum(value: number, decimals = 2): number {
  return parseFloat(value.toFixed(decimals));
}

function readRaw(key: string): unknown | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function findRaw(keys: string[]): unknown | null {
  for (const key of keys) {
    const data = readRaw(key);
    if (data !== null) return data;
  }
  return null;
}

function mesActual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function diasDelMes(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

interface ParsedRestosuite {
  ventasMes: number;
  clientesMes: number;
  ventasHoy: number;
  clientesHoy: number;
  ventasBebidaMes: number;
  found: boolean;
}

function parseRestosuite(data: unknown): ParsedRestosuite {
  const empty: ParsedRestosuite = {
    ventasMes: 0,
    clientesMes: 0,
    ventasHoy: 0,
    clientesHoy: 0,
    ventasBebidaMes: 0,
    found: false,
  };
  if (!data || typeof data !== "object") return empty;

  const registros = Array.isArray((data as Record<string, unknown>).registros)
    ? ((data as Record<string, unknown>).registros as unknown[])
    : [];
  if (registros.length === 0) return empty;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const hoy = hoyIso();

  let ventasMes = 0;
  let clientesMes = 0;
  let ventasHoy = 0;
  let clientesHoy = 0;
  let ventasBebidaMes = 0;

  for (const item of registros) {
    if (!item || typeof item !== "object") continue;
    const reg = item as Record<string, unknown>;
    const fecha = String(reg.fecha ?? "").slice(0, 10);
    const ventas = parseFloat(String(reg.ventas ?? 0)) || 0;
    const clientes = parseInt(String(reg.clientes ?? 0), 10) || 0;
    const bebida = parseFloat(String(reg.ventasBebida ?? 0)) || 0;

    if (fecha === hoy) {
      ventasHoy += ventas;
      clientesHoy += clientes;
    }

    const d = new Date(fecha + "T12:00:00");
    if (d.getFullYear() === year && d.getMonth() === month) {
      ventasMes += ventas;
      clientesMes += clientes;
      ventasBebidaMes += bebida;
    }
  }

  return {
    ventasMes: fmtNum(ventasMes),
    clientesMes,
    ventasHoy: fmtNum(ventasHoy),
    clientesHoy,
    ventasBebidaMes: fmtNum(ventasBebidaMes),
    found: ventasMes > 0,
  };
}

interface ParsedProfit {
  ventas: number;
  compras: number;
  personal: number;
  alquiler: number;
  suministros: number;
  gestoria: number;
  otros: number;
  beneficio: number;
  margenPct: number;
  costePersonalPct: number;
  found: boolean;
}

function parseProfit(data: unknown): ParsedProfit {
  const empty: ParsedProfit = {
    ventas: 0,
    compras: 0,
    personal: 0,
    alquiler: 0,
    suministros: 0,
    gestoria: 0,
    otros: 0,
    beneficio: 0,
    margenPct: 0,
    costePersonalPct: 0,
    found: false,
  };
  if (!data || typeof data !== "object") return empty;

  const registros = Array.isArray((data as Record<string, unknown>).registros)
    ? ((data as Record<string, unknown>).registros as unknown[])
    : [];
  if (registros.length === 0) return empty;

  const mes = mesActual();
  let reg: Record<string, unknown> | null = null;

  for (const item of registros) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    if (String(r.mes ?? "").slice(0, 7) === mes) {
      reg = r;
      break;
    }
  }
  if (!reg) reg = registros[registros.length - 1] as Record<string, unknown>;

  const ventas = parseFloat(String(reg.ventas ?? 0)) || 0;
  if (ventas <= 0) return empty;

  const compras = parseFloat(String(reg.compras ?? 0)) || 0;
  const personal = parseFloat(String(reg.personal ?? 0)) || 0;
  const alquiler = parseFloat(String(reg.alquiler ?? 0)) || 0;
  const suministros = parseFloat(String(reg.suministros ?? 0)) || 0;
  const gestoria = parseFloat(String(reg.gestoria ?? 0)) || 0;
  const otros = parseFloat(String(reg.otros ?? 0)) || 0;
  const totalCostes = compras + personal + alquiler + suministros + gestoria + otros;
  const beneficio = ventas - totalCostes;

  return {
    ventas: fmtNum(ventas),
    compras: fmtNum(compras),
    personal: fmtNum(personal),
    alquiler: fmtNum(alquiler),
    suministros: fmtNum(suministros),
    gestoria: fmtNum(gestoria),
    otros: fmtNum(otros),
    beneficio: fmtNum(beneficio),
    margenPct: fmtNum((beneficio / ventas) * 100, 1),
    costePersonalPct: fmtNum((personal / ventas) * 100, 1),
    found: true,
  };
}

interface ParsedReviews {
  rating: number;
  totalResenas: number;
  pendientes: number;
  found: boolean;
}

function parseReviews(data: unknown): ParsedReviews {
  const empty: ParsedReviews = { rating: 0, totalResenas: 0, pendientes: 0, found: false };
  if (!data || typeof data !== "object") return empty;

  const r = data as Record<string, unknown>;
  const totalResenas = Math.round(parseFloat(String(r.totalResenas ?? 0)) || 0);
  const rating = fmtNum(parseFloat(String(r.ratingActual ?? 0)) || 0, 2);

  const resenas = Array.isArray(r.resenas) ? r.resenas : [];
  let pendientes = 0;
  for (const item of resenas) {
    if (item && typeof item === "object" && !(item as Record<string, unknown>).respondida) {
      pendientes++;
    }
  }

  if (totalResenas <= 0 && resenas.length === 0) return empty;

  return {
    rating: rating > 0 ? rating : 4.9,
    totalResenas: totalResenas || resenas.length,
    pendientes,
    found: true,
  };
}

function parseInventarioStockBajo(data: unknown): number {
  const arr = Array.isArray(data) ? data : [];
  let count = 0;

  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const stock = parseFloat(String(r.stock ?? r.stockActual ?? 0)) || 0;
    const minimo = parseFloat(String(r.stockMinimo ?? 0)) || 0;
    const estado = String(r.estado ?? "");

    if (estado === "bajo" || estado === "critico" || estado === "agotado") {
      count++;
    } else if (minimo > 0 && stock <= minimo) {
      count++;
    } else if (stock <= 0) {
      count++;
    }
  }

  return count;
}

function seedBeneficio(): { beneficio: number; margenPct: number; costePersonalPct: number } {
  const ventas = SEED.ventasMes;
  const totalCostes =
    SEED.compras + SEED.personal + SEED.alquiler + SEED.suministros + SEED.gestoria + SEED.otros;
  const beneficio = ventas - totalCostes;
  return {
    beneficio: fmtNum(beneficio),
    margenPct: fmtNum((beneficio / ventas) * 100, 1),
    costePersonalPct: fmtNum((SEED.personal / ventas) * 100, 1),
  };
}

function buildResumenEjecutivo(d: {
  proyeccionMensual: number;
  falta100k: number;
  beneficioEstimado: number;
  margenNetoPct: number;
  googleRating: number;
  reviewsActuales: number;
  stockBajo: number;
  progreso100kPct: number;
}): string {
  const partes = [
    `Karuma va camino de ${d.proyeccionMensual.toLocaleString("es-ES")} € este mes`,
    d.falta100k > 0
      ? `faltan ${d.falta100k.toLocaleString("es-ES")} € para el objetivo de 100K (${d.progreso100kPct}%)`
      : "y ha superado el objetivo de 100K",
    `Beneficio estimado ${d.beneficioEstimado.toLocaleString("es-ES")} € con margen neto del ${d.margenNetoPct}%`,
    `Google ${d.googleRating}★ (${d.reviewsActuales} reseñas)`,
  ];

  if (d.stockBajo > 0) {
    partes.push(`${d.stockBajo} producto(s) con stock bajo requieren atención`);
  }

  return partes.join(". ") + ".";
}

function buildPrioridades(d: {
  progreso100kPct: number;
  comprasMes: number;
  ventasMes: number;
  stockBajo: number;
  reviewsActuales: number;
  pendientesReviews: number;
  ventasBebidaMes: number;
  costePersonalPct: number;
}): PrioridadHoy[] {
  const comprasPct = d.ventasMes > 0 ? (d.comprasMes / d.ventasMes) * 100 : 0;
  const bebidaPct = d.ventasMes > 0 ? (d.ventasBebidaMes / d.ventasMes) * 100 : 0;

  return [
    {
      id: "ventas",
      titulo: "Subir ventas",
      descripcion:
        d.progreso100kPct < 85
          ? `Progreso 100K al ${d.progreso100kPct}%. Refuerza sala y delivery en fin de semana.`
          : "Buen ritmo de ventas. Mantén promos y servicio en hora punta.",
      urgencia: d.progreso100kPct < 70 ? "alta" : d.progreso100kPct < 90 ? "media" : "baja",
      activa: d.progreso100kPct < 90,
    },
    {
      id: "compras",
      titulo: "Controlar compras",
      descripcion:
        comprasPct > 28
          ? `Compras al ${fmtNum(comprasPct, 1)}% de ventas. Revisa pedidos y mermas.`
          : `Compras al ${fmtNum(comprasPct, 1)}% — en rango saludable.`,
      urgencia: comprasPct > 30 ? "alta" : comprasPct > 28 ? "media" : "baja",
      activa: comprasPct > 28,
    },
    {
      id: "stock",
      titulo: "Revisar stock",
      descripcion:
        d.stockBajo > 0
          ? `${d.stockBajo} producto(s) bajo mínimo. Revisa Inventario antes del servicio.`
          : "Stock general correcto. Monitoriza pescado fresco a diario.",
      urgencia: d.stockBajo >= 3 ? "alta" : d.stockBajo > 0 ? "media" : "baja",
      activa: d.stockBajo > 0,
    },
    {
      id: "reviews",
      titulo: "Pedir reviews",
      descripcion:
        d.reviewsActuales < 500 || d.pendientesReviews > 0
          ? `${d.reviewsActuales} reseñas · ${d.pendientesReviews} sin responder. Pide valoración en sala y tickets.`
          : "Buen volumen de reseñas. Responde las nuevas en menos de 48 h.",
      urgencia: d.pendientesReviews >= 3 ? "alta" : d.reviewsActuales < 600 ? "media" : "baja",
      activa: d.reviewsActuales < 600 || d.pendientesReviews > 0,
    },
    {
      id: "bebidas",
      titulo: "Mejorar bebidas",
      descripcion:
        bebidaPct > 0 && bebidaPct < 14
          ? `Bebidas al ${fmtNum(bebidaPct, 1)}% de ventas (objetivo ~15%). Sugiere maridaje en sala.`
          : "Impulsa venta de sake, cerveza y refrescos en servicio de cena.",
      urgencia: bebidaPct > 0 && bebidaPct < 13 ? "media" : "baja",
      activa: bebidaPct < 15 || bebidaPct === 0,
    },
  ];
}

export function loadCeoDashboard(): CeoDashboard {
  const resto = parseRestosuite(findRaw([STORAGE_KEYS.restosuite]));
  const profit = parseProfit(findRaw([STORAGE_KEYS.profit]));
  const reviews = parseReviews(findRaw([STORAGE_KEYS.reviews]));
  const stockBajo = parseInventarioStockBajo(findRaw([...STORAGE_KEYS.inventario]));

  const fuentes: string[] = [];
  if (resto.found) fuentes.push("Restosuite");
  if (profit.found) fuentes.push("Profit");
  if (reviews.found) fuentes.push("Reviews");
  if (stockBajo > 0 || findRaw([...STORAGE_KEYS.inventario])) fuentes.push("Inventario");

  const usandoDatosReales = fuentes.length > 0;

  const now = new Date();
  const day = Math.max(1, now.getDate());
  const daysInMonth = diasDelMes(now.getFullYear(), now.getMonth());

  let ventasMes = resto.found ? resto.ventasMes : profit.found ? profit.ventas : SEED.ventasMes;
  let clientesMes = resto.found ? resto.clientesMes : SEED.clientesMes;
  let ticketMedio =
    clientesMes > 0 ? fmtNum(ventasMes / clientesMes) : SEED.ticketMedio;

  if (!resto.found && !profit.found) {
    ventasMes = SEED.ventasMes;
    clientesMes = SEED.clientesMes;
    ticketMedio = SEED.ticketMedio;
  }

  let ventasHoy = resto.ventasHoy;
  let clientesHoy = resto.clientesHoy;
  if (ventasHoy <= 0 && ventasMes > 0) {
    ventasHoy = fmtNum(ventasMes / day);
    clientesHoy = ticketMedio > 0 ? Math.round(ventasHoy / ticketMedio) : 0;
  }

  const proyeccionMensual = fmtNum((ventasMes / day) * daysInMonth, 0);
  const falta100k = fmtNum(Math.max(0, OBJETIVO_VENTAS - ventasMes), 0);
  const progreso100kPct = fmtNum(Math.min(100, (ventasMes / OBJETIVO_VENTAS) * 100), 1);

  const seedBen = seedBeneficio();
  const beneficioEstimado = profit.found ? profit.beneficio : seedBen.beneficio;
  const margenNetoPct = profit.found ? profit.margenPct : seedBen.margenPct;
  const costePersonalPct = profit.found ? profit.costePersonalPct : seedBen.costePersonalPct;
  const comprasMes = profit.found ? profit.compras : SEED.compras;
  const personalMes = profit.found ? profit.personal : SEED.personal;

  const googleRating = reviews.found ? reviews.rating : SEED.rating;
  const reviewsActuales = reviews.found ? reviews.totalResenas : SEED.reviews;
  const pendientesReviews = reviews.found ? reviews.pendientes : 0;
  const ventasBebidaMes = resto.found
    ? resto.ventasBebidaMes
    : fmtNum(ventasMes * SEED.ventasBebidaRatio);

  const resumenEjecutivo = buildResumenEjecutivo({
    proyeccionMensual,
    falta100k,
    beneficioEstimado,
    margenNetoPct,
    googleRating,
    reviewsActuales,
    stockBajo,
    progreso100kPct,
  });

  const prioridades = buildPrioridades({
    progreso100kPct,
    comprasMes,
    ventasMes,
    stockBajo,
    reviewsActuales,
    pendientesReviews,
    ventasBebidaMes,
    costePersonalPct,
  });

  return {
    ventasHoy,
    clientesHoy,
    ventasMes,
    objetivo100k: OBJETIVO_VENTAS,
    progreso100kPct,
    falta100k,
    proyeccionMensual,
    beneficioEstimado,
    margenNetoPct,
    clientesMes,
    ticketMedio,
    googleRating,
    reviewsActuales,
    stockBajo,
    costePersonalPct,
    comprasMes,
    personalMes,
    resumenEjecutivo,
    prioridades,
    usandoDatosReales,
    fuentes,
  };
}
