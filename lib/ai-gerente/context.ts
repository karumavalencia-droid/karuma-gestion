import { STORAGE_KEY as PROFIT_KEY } from "@/lib/profit/helpers";
import { STORAGE_KEY as RESTOSUITE_KEY } from "@/lib/objetivo/helpers";
import { STORAGE_KEY as REVIEWS_KEY, OBJETIVO_RESENAS, fmtNum } from "@/lib/reviews/helpers";

export interface GerenteReviews {
  rating: number;
  totalResenas: number;
  objetivoResenas: number;
  progresoPct: number;
  pendientes: number;
  positivas: number;
  negativas: number;
}

export interface GerenteRestosuite {
  ventasMes: number;
  clientesMes: number;
  ticketMedio: number;
  ventasHoy: number;
  clientesHoy: number;
  registros: number;
  ultimaFecha: string | null;
}

export interface GerenteProfit {
  ventas: number;
  compras: number;
  personal: number;
  alquiler: number;
  beneficio: number;
  margenPct: number;
  registros: number;
  mes: string | null;
}

export interface GerenteContext {
  reviews: GerenteReviews | null;
  restosuite: GerenteRestosuite | null;
  profit: GerenteProfit | null;
  fuentes: string[];
  hasLiveData: boolean;
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

function mesActual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseReviews(data: unknown): GerenteReviews | null {
  if (!data || typeof data !== "object") return null;
  const r = data as Record<string, unknown>;
  const totalResenas = Math.round(parseFloat(String(r.totalResenas ?? 0)) || 0);
  const rating = fmtNum(Math.min(5, Math.max(1, parseFloat(String(r.ratingActual ?? 0)) || 0)), 2);
  const objetivoResenas = Math.round(
    parseFloat(String(r.objetivoResenas ?? OBJETIVO_RESENAS)) || OBJETIVO_RESENAS,
  );

  const resenas = Array.isArray(r.resenas) ? r.resenas : [];
  const registrosMensuales = Array.isArray(r.registrosMensuales) ? r.registrosMensuales : [];
  const mes = mesActual();
  const regMes = registrosMensuales.find(
    (item) => item && typeof item === "object" && String((item as Record<string, unknown>).mes ?? "").slice(0, 7) === mes,
  ) as Record<string, unknown> | undefined;

  let positivas = 0;
  let negativas = 0;
  let pendientes = 0;
  for (const item of resenas) {
    if (!item || typeof item !== "object") continue;
    const rev = item as Record<string, unknown>;
    const ratingRev = Math.round(parseFloat(String(rev.rating ?? 5)) || 5);
    if (ratingRev >= 4) positivas++;
    else negativas++;
    if (!rev.respondida) pendientes++;
  }

  if (totalResenas <= 0 && resenas.length === 0) return null;

  return {
    rating: rating > 0 ? rating : 4.9,
    totalResenas: totalResenas || resenas.length,
    objetivoResenas,
    progresoPct: fmtNum(
      Math.min(100, ((totalResenas || resenas.length) / objetivoResenas) * 100),
      1,
    ),
    pendientes: regMes
      ? Math.round(parseFloat(String(regMes.pendientesRespuesta ?? 0)) || 0)
      : pendientes,
    positivas: regMes ? Math.round(parseFloat(String(regMes.positivas ?? 0)) || 0) : positivas,
    negativas: regMes ? Math.round(parseFloat(String(regMes.negativas ?? 0)) || 0) : negativas,
  };
}

function parseRestosuite(data: unknown): GerenteRestosuite | null {
  if (!data || typeof data !== "object") return null;
  const r = data as Record<string, unknown>;
  const registros = Array.isArray(r.registros) ? r.registros : [];
  if (registros.length === 0) return null;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const hoy = hoyIso();

  let ventasMes = 0;
  let clientesMes = 0;
  let ventasHoy = 0;
  let clientesHoy = 0;
  const fechas: string[] = [];

  for (const item of registros) {
    if (!item || typeof item !== "object") continue;
    const reg = item as Record<string, unknown>;
    const fecha = String(reg.fecha ?? "").slice(0, 10);
    if (fecha) fechas.push(fecha);
    const ventas = parseFloat(String(reg.ventas ?? 0)) || 0;
    const clientes = parseInt(String(reg.clientes ?? 0), 10) || 0;

    if (fecha === hoy) {
      ventasHoy += ventas;
      clientesHoy += clientes;
    }

    const d = new Date(fecha + "T12:00:00");
    if (d.getFullYear() === year && d.getMonth() === month) {
      ventasMes += ventas;
      clientesMes += clientes;
    }
  }

  fechas.sort();
  const ultimaFecha = fechas.length > 0 ? fechas[fechas.length - 1] : null;

  return {
    ventasMes: fmtNum(ventasMes),
    clientesMes,
    ticketMedio: clientesMes > 0 ? fmtNum(ventasMes / clientesMes) : 0,
    ventasHoy: fmtNum(ventasHoy),
    clientesHoy,
    registros: registros.length,
    ultimaFecha,
  };
}

function parseProfit(data: unknown): GerenteProfit | null {
  if (!data || typeof data !== "object") return null;
  const r = data as Record<string, unknown>;
  const registros = Array.isArray(r.registros) ? r.registros : [];
  if (registros.length === 0) return null;

  const mes = mesActual();
  let registroMes: Record<string, unknown> | null = null;

  for (const item of registros) {
    if (!item || typeof item !== "object") continue;
    const reg = item as Record<string, unknown>;
    if (String(reg.mes ?? "").slice(0, 7) === mes) {
      registroMes = reg;
      break;
    }
  }

  const reg = registroMes ?? (registros[registros.length - 1] as Record<string, unknown>);
  const ventas = parseFloat(String(reg.ventas ?? 0)) || 0;
  const compras = parseFloat(String(reg.compras ?? 0)) || 0;
  const personal = parseFloat(String(reg.personal ?? 0)) || 0;
  const alquiler = parseFloat(String(reg.alquiler ?? 0)) || 0;
  const suministros = parseFloat(String(reg.suministros ?? 0)) || 0;
  const gestoria = parseFloat(String(reg.gestoria ?? 0)) || 0;
  const otros = parseFloat(String(reg.otros ?? 0)) || 0;
  const totalCostes = compras + personal + alquiler + suministros + gestoria + otros;
  const beneficio = ventas - totalCostes;

  if (ventas <= 0) return null;

  return {
    ventas: fmtNum(ventas),
    compras: fmtNum(compras),
    personal: fmtNum(personal),
    alquiler: fmtNum(alquiler),
    beneficio: fmtNum(beneficio),
    margenPct: fmtNum((beneficio / ventas) * 100, 1),
    registros: registros.length,
    mes: String(reg.mes ?? mes).slice(0, 7),
  };
}

export function loadGerenteContext(): GerenteContext {
  const reviews = parseReviews(readRaw(REVIEWS_KEY));
  const restosuite = parseRestosuite(readRaw(RESTOSUITE_KEY));
  const profit = parseProfit(readRaw(PROFIT_KEY));

  const fuentes: string[] = [];
  if (reviews) fuentes.push("Google Reviews");
  if (restosuite) fuentes.push("Restosuite");
  if (profit) fuentes.push("Profit");

  return {
    reviews,
    restosuite,
    profit,
    fuentes,
    hasLiveData: fuentes.length > 0,
  };
}
