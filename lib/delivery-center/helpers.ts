import {
  DeliveryStore,
  PedidoDeliveryCenter,
  PlataformaDeliveryCenter,
  RegistroDeliveryMes,
} from "@/lib/types";
import { pedidosDelivery } from "@/lib/data/delivery";

export const STORAGE_KEY = "karuma_delivery_v1";
export const COMISION_UBER_DEFAULT = 30;
export const COMISION_GLOVO_DEFAULT = 25;
export const COSTE_COMIDA_DEFAULT = 32;

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function fmtNum(value: number, decimals = 2): number {
  return parseFloat(value.toFixed(decimals));
}

function mesActual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function seedPedidos(): PedidoDeliveryCenter[] {
  const hoy = new Date().toISOString().slice(0, 10);
  return pedidosDelivery.map((p) => ({
    id: p.id,
    fecha: hoy,
    plataforma: p.plataforma,
    importe: p.importe,
    estado: p.estado,
  }));
}

function seedRegistros(): RegistroDeliveryMes[] {
  return [
    {
      id: "delivery-2026-06",
      mes: "2026-06",
      ventasUber: 18_500,
      ventasGlovo: 14_200,
      pedidosUber: 372,
      pedidosGlovo: 318,
    },
  ];
}

export function seedDelivery(): DeliveryStore {
  return {
    comisionUberPct: COMISION_UBER_DEFAULT,
    comisionGlovoPct: COMISION_GLOVO_DEFAULT,
    costeComidaPct: COSTE_COMIDA_DEFAULT,
    registros: seedRegistros(),
    pedidos: seedPedidos(),
  };
}

function normalizePedido(raw: unknown): PedidoDeliveryCenter | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const fecha = String(r.fecha ?? "").slice(0, 10);
  if (!fecha) return null;

  const plataforma = String(r.plataforma ?? "");
  const plataformas: PlataformaDeliveryCenter[] = ["Uber Eats", "Glovo"];

  return {
    id: String(r.id ?? genId()),
    fecha,
    plataforma: plataformas.includes(plataforma as PlataformaDeliveryCenter)
      ? (plataforma as PlataformaDeliveryCenter)
      : "Uber Eats",
    importe: fmtNum(parseFloat(String(r.importe ?? 0)) || 0),
    estado: (["entregado", "en camino", "preparando", "cancelado"].includes(
      String(r.estado ?? ""),
    )
      ? r.estado
      : "entregado") as PedidoDeliveryCenter["estado"],
  };
}

function normalizeRegistro(raw: unknown): RegistroDeliveryMes | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const mes = String(r.mes ?? "").slice(0, 7);
  if (!mes || mes.length < 7) return null;

  return {
    id: String(r.id ?? genId()),
    mes,
    ventasUber: fmtNum(parseFloat(String(r.ventasUber ?? 0)) || 0),
    ventasGlovo: fmtNum(parseFloat(String(r.ventasGlovo ?? 0)) || 0),
    pedidosUber: Math.max(0, Math.round(parseFloat(String(r.pedidosUber ?? 0)) || 0)),
    pedidosGlovo: Math.max(0, Math.round(parseFloat(String(r.pedidosGlovo ?? 0)) || 0)),
  };
}

export function loadDelivery(): DeliveryStore {
  if (typeof window === "undefined") return seedDelivery();

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedDelivery();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const registros = Array.isArray(parsed.registros)
      ? parsed.registros
          .map(normalizeRegistro)
          .filter((r): r is RegistroDeliveryMes => r !== null)
      : [];
    const pedidos = Array.isArray(parsed.pedidos)
      ? parsed.pedidos.map(normalizePedido).filter((p): p is PedidoDeliveryCenter => p !== null)
      : [];

    const store: DeliveryStore = {
      comisionUberPct: fmtNum(
        parseFloat(String(parsed.comisionUberPct ?? COMISION_UBER_DEFAULT)) ||
          COMISION_UBER_DEFAULT,
        1,
      ),
      comisionGlovoPct: fmtNum(
        parseFloat(String(parsed.comisionGlovoPct ?? COMISION_GLOVO_DEFAULT)) ||
          COMISION_GLOVO_DEFAULT,
        1,
      ),
      costeComidaPct: fmtNum(
        parseFloat(String(parsed.costeComidaPct ?? COSTE_COMIDA_DEFAULT)) ||
          COSTE_COMIDA_DEFAULT,
        1,
      ),
      registros: registros.length > 0 ? registros : seedRegistros(),
      pedidos: pedidos.length > 0 ? pedidos : seedPedidos(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return store;
  } catch {
    const seeded = seedDelivery();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

export function saveDelivery(store: DeliveryStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getRegistroMes(
  registros: RegistroDeliveryMes[],
  year: number,
  month: number,
): RegistroDeliveryMes | null {
  const key = `${year}-${String(month + 1).padStart(2, "0")}`;
  return registros.find((r) => r.mes === key) ?? null;
}

export function mesLabel(mes: string): string {
  const [y, m] = mes.split("-");
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

export interface DeliveryMetrics {
  ventasUber: number;
  ventasGlovo: number;
  comisionUber: number;
  comisionGlovo: number;
  comisionUberPct: number;
  comisionGlovoPct: number;
  ventasTotal: number;
  comisionTotal: number;
  pedidosTotal: number;
  pedidosUber: number;
  pedidosGlovo: number;
  ticketMedio: number;
  ticketUber: number;
  ticketGlovo: number;
  netoDespuesComision: number;
  costeComida: number;
  beneficioEstimado: number;
  margenPct: number;
}

function aggregatePedidosMes(
  pedidos: PedidoDeliveryCenter[],
  year: number,
  month: number,
): { uber: { ventas: number; pedidos: number }; glovo: { ventas: number; pedidos: number } } {
  const uber = { ventas: 0, pedidos: 0 };
  const glovo = { ventas: 0, pedidos: 0 };

  for (const p of pedidos) {
    const d = new Date(p.fecha + "T12:00:00");
    if (d.getFullYear() !== year || d.getMonth() !== month) continue;
    if (p.plataforma === "Uber Eats") {
      uber.ventas += p.importe;
      uber.pedidos++;
    } else {
      glovo.ventas += p.importe;
      glovo.pedidos++;
    }
  }

  return {
    uber: { ventas: fmtNum(uber.ventas), pedidos: uber.pedidos },
    glovo: { ventas: fmtNum(glovo.ventas), pedidos: glovo.pedidos },
  };
}

export function computeMetrics(store: DeliveryStore, now = new Date()): DeliveryMetrics {
  const year = now.getFullYear();
  const month = now.getMonth();
  const registro = getRegistroMes(store.registros, year, month);
  const agg = aggregatePedidosMes(store.pedidos, year, month);

  let ventasUber = registro?.ventasUber ?? 0;
  let ventasGlovo = registro?.ventasGlovo ?? 0;
  let pedidosUber = registro?.pedidosUber ?? 0;
  let pedidosGlovo = registro?.pedidosGlovo ?? 0;

  if (agg.uber.pedidos > 0 && ventasUber === 0) {
    ventasUber = agg.uber.ventas;
    pedidosUber = agg.uber.pedidos;
  }
  if (agg.glovo.pedidos > 0 && ventasGlovo === 0) {
    ventasGlovo = agg.glovo.ventas;
    pedidosGlovo = agg.glovo.pedidos;
  }

  const ventasTotal = fmtNum(ventasUber + ventasGlovo);
  const pedidosTotal = pedidosUber + pedidosGlovo;

  const comisionUber = fmtNum(ventasUber * (store.comisionUberPct / 100));
  const comisionGlovo = fmtNum(ventasGlovo * (store.comisionGlovoPct / 100));
  const comisionTotal = fmtNum(comisionUber + comisionGlovo);

  const netoDespuesComision = fmtNum(ventasTotal - comisionTotal);
  const costeComida = fmtNum(ventasTotal * (store.costeComidaPct / 100));
  const beneficioEstimado = fmtNum(netoDespuesComision - costeComida);
  const margenPct = ventasTotal > 0 ? fmtNum((beneficioEstimado / ventasTotal) * 100, 1) : 0;

  const ticketMedio = pedidosTotal > 0 ? fmtNum(ventasTotal / pedidosTotal) : 0;
  const ticketUber = pedidosUber > 0 ? fmtNum(ventasUber / pedidosUber) : 0;
  const ticketGlovo = pedidosGlovo > 0 ? fmtNum(ventasGlovo / pedidosGlovo) : 0;

  return {
    ventasUber,
    ventasGlovo,
    comisionUber,
    comisionGlovo,
    comisionUberPct: store.comisionUberPct,
    comisionGlovoPct: store.comisionGlovoPct,
    ventasTotal,
    comisionTotal,
    pedidosTotal,
    pedidosUber,
    pedidosGlovo,
    ticketMedio,
    ticketUber,
    ticketGlovo,
    netoDespuesComision,
    costeComida,
    beneficioEstimado,
    margenPct,
  };
}

export interface SugerenciaAI {
  id: string;
  tipo: "success" | "warning" | "info" | "danger";
  titulo: string;
  mensaje: string;
}

export function generarSugerenciasAI(m: DeliveryMetrics): SugerenciaAI[] {
  const sugerencias: SugerenciaAI[] = [];

  if (m.ventasTotal <= 0) return sugerencias;

  const margenUber =
    m.ventasUber > 0
      ? fmtNum(
          ((m.ventasUber * (1 - m.comisionUberPct / 100) * (1 - COSTE_COMIDA_DEFAULT / 100)) /
            m.ventasUber) *
            100,
          1,
        )
      : 0;
  const margenGlovo =
    m.ventasGlovo > 0
      ? fmtNum(
          ((m.ventasGlovo * (1 - m.comisionGlovoPct / 100) * (1 - COSTE_COMIDA_DEFAULT / 100)) /
            m.ventasGlovo) *
            100,
          1,
        )
      : 0;

  sugerencias.push({
    id: "rentabilidad-global",
    tipo: m.beneficioEstimado > 0 ? "success" : "danger",
    titulo: "Rentabilidad delivery",
    mensaje: `Beneficio estimado ${m.beneficioEstimado.toLocaleString("es-ES")} € (${m.margenPct}% margen) sobre ${m.ventasTotal.toLocaleString("es-ES")} € en ventas. Comisiones totales: ${m.comisionTotal.toLocaleString("es-ES")} € · Coste comida ~${m.costeComida.toLocaleString("es-ES")} €.`,
  });

  if (m.ventasUber > 0 && m.ventasGlovo > 0) {
    const mejor = margenUber >= margenGlovo ? "Uber Eats" : "Glovo";
    const peor = mejor === "Uber Eats" ? "Glovo" : "Uber Eats";
    sugerencias.push({
      id: "comparativa",
      tipo: "info",
      titulo: "Uber vs Glovo",
      mensaje: `${mejor} es más rentable (margen ~${Math.max(margenUber, margenGlovo)}% vs ~${Math.min(margenUber, margenGlovo)}%). ${peor} cobra ${peor === "Uber Eats" ? m.comisionUberPct : m.comisionGlovoPct}% de comisión.`,
    });
  }

  if (m.comisionTotal / m.ventasTotal > 0.28) {
    sugerencias.push({
      id: "comision-alta",
      tipo: "warning",
      titulo: "Comisiones elevadas",
      mensaje: `Las comisiones representan el ${fmtNum((m.comisionTotal / m.ventasTotal) * 100, 1)}% de las ventas delivery. Valora promos directas (web/teléfono) para captar pedidos sin comisión.`,
    });
  }

  if (m.ticketUber > 0 && m.ticketGlovo > 0) {
    const diff = Math.abs(m.ticketUber - m.ticketGlovo);
    sugerencias.push({
      id: "ticket",
      tipo: "info",
      titulo: "Ticket medio",
      mensaje: `Ticket Uber ${m.ticketUber.toLocaleString("es-ES")} € · Glovo ${m.ticketGlovo.toLocaleString("es-ES")} €. Un menú combinado de +${diff.toLocaleString("es-ES")} € en la plataforma con ticket bajo puede mejorar margen.`,
    });
  }

  if (m.margenPct < 15) {
    sugerencias.push({
      id: "margen-bajo",
      tipo: "danger",
      titulo: "Margen bajo en delivery",
      mensaje: `Margen del ${m.margenPct}% por debajo del objetivo (~20%). Revisa escandallos, packaging y sube precios en platos de alto volumen en apps.`,
    });
  } else {
    sugerencias.push({
      id: "margen-ok",
      tipo: "success",
      titulo: "Margen saludable",
      mensaje: `El delivery genera ${m.beneficioEstimado.toLocaleString("es-ES")} € de beneficio estimado. Mantén el mix de pedidos y controla mermas en envases.`,
    });
  }

  sugerencias.push({
    id: "pedidos",
    tipo: "info",
    titulo: "Volumen de pedidos",
    mensaje: `${m.pedidosTotal} pedidos este mes (${m.pedidosUber} Uber · ${m.pedidosGlovo} Glovo). Cada 10 pedidos extra con ticket ${m.ticketMedio.toLocaleString("es-ES")} € añaden ~${fmtNum(m.ticketMedio * 10 * (m.margenPct / 100))} € de beneficio.`,
  });

  return sugerencias;
}

export const EMPTY_PEDIDO_FORM = {
  fecha: new Date().toISOString().slice(0, 10),
  plataforma: "Uber Eats" as PlataformaDeliveryCenter,
  importe: "",
  estado: "entregado" as PedidoDeliveryCenter["estado"],
};

export type PedidoForm = typeof EMPTY_PEDIDO_FORM;

export function pedidoToForm(p: PedidoDeliveryCenter): PedidoForm {
  return {
    fecha: p.fecha,
    plataforma: p.plataforma,
    importe: String(p.importe),
    estado: p.estado,
  };
}

export function parsePedidoForm(form: PedidoForm): Omit<PedidoDeliveryCenter, "id"> | null {
  const fecha = form.fecha.slice(0, 10);
  if (!fecha) return null;
  const importe = fmtNum(parseFloat(form.importe) || 0);
  if (importe <= 0) return null;

  return {
    fecha,
    plataforma: form.plataforma,
    importe,
    estado: form.estado,
  };
}

export const EMPTY_MES_FORM = {
  mes: new Date().toISOString().slice(0, 7),
  ventasUber: "",
  ventasGlovo: "",
  pedidosUber: "",
  pedidosGlovo: "",
};

export type MesForm = typeof EMPTY_MES_FORM;

export function registroToForm(r: RegistroDeliveryMes): MesForm {
  return {
    mes: r.mes,
    ventasUber: String(r.ventasUber),
    ventasGlovo: String(r.ventasGlovo),
    pedidosUber: String(r.pedidosUber),
    pedidosGlovo: String(r.pedidosGlovo),
  };
}

export function parseMesForm(form: MesForm): Omit<RegistroDeliveryMes, "id"> | null {
  const mes = form.mes.slice(0, 7);
  if (!mes || mes.length < 7) return null;

  return {
    mes,
    ventasUber: fmtNum(parseFloat(form.ventasUber) || 0),
    ventasGlovo: fmtNum(parseFloat(form.ventasGlovo) || 0),
    pedidosUber: Math.max(0, Math.round(parseFloat(form.pedidosUber) || 0)),
    pedidosGlovo: Math.max(0, Math.round(parseFloat(form.pedidosGlovo) || 0)),
  };
}
