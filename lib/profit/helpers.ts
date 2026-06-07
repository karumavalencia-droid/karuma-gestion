import { ProfitStore, RegistroProfit } from "@/lib/types";

export const STORAGE_KEY = "karuma_profit_v1";
export const OBJETIVO_VENTAS = 100_000;

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function fmtNum(value: number, decimals = 2): number {
  return parseFloat(value.toFixed(decimals));
}

function seedRegistros(): RegistroProfit[] {
  return [
    {
      id: "profit-2026-06",
      mes: "2026-06",
      ventas: 71734.55,
      compras: 18000,
      personal: 27000,
      alquiler: 7000,
      suministros: 650,
      gestoria: 400,
      otros: 2500,
    },
  ];
}

export function seedProfit(): ProfitStore {
  return { registros: seedRegistros() };
}

function normalizeRegistro(raw: unknown): RegistroProfit | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const mes = String(r.mes ?? "").slice(0, 7);
  if (!mes || mes.length < 7) return null;

  return {
    id: String(r.id ?? genId()),
    mes,
    ventas: fmtNum(parseFloat(String(r.ventas ?? 0)) || 0),
    compras: fmtNum(parseFloat(String(r.compras ?? 0)) || 0),
    personal: fmtNum(parseFloat(String(r.personal ?? 0)) || 0),
    alquiler: fmtNum(parseFloat(String(r.alquiler ?? 0)) || 0),
    suministros: fmtNum(parseFloat(String(r.suministros ?? r.luzAguaGas ?? 0)) || 0),
    gestoria: fmtNum(parseFloat(String(r.gestoria ?? 0)) || 0),
    otros: fmtNum(parseFloat(String(r.otros ?? r.otrosGastos ?? 0)) || 0),
  };
}

export function loadProfit(): ProfitStore {
  if (typeof window === "undefined") return seedProfit();

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedProfit();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const registros = Array.isArray(parsed.registros)
      ? parsed.registros
          .map(normalizeRegistro)
          .filter((r): r is RegistroProfit => r !== null)
      : [];

    const store: ProfitStore = {
      registros: registros.length > 0 ? registros : seedRegistros(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return store;
  } catch {
    const seeded = seedProfit();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

export function saveProfit(store: ProfitStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getRegistroMes(
  registros: RegistroProfit[],
  year: number,
  month: number,
): RegistroProfit | null {
  const key = `${year}-${String(month + 1).padStart(2, "0")}`;
  return registros.find((r) => r.mes === key) ?? null;
}

export function mesLabel(mes: string): string {
  const [y, m] = mes.split("-");
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

export interface ProfitMetrics {
  ventas: number;
  compras: number;
  personal: number;
  alquiler: number;
  suministros: number;
  gestoria: number;
  otros: number;
  alquilerImpuestos: number;
  totalCostes: number;
  costesFijos: number;
  beneficioBruto: number;
  beneficioNeto: number;
  margenNetoPct: number;
  costePersonalPct: number;
  costeComidaPct: number;
  puntoEquilibrio: number;
  ventasNecesarias100k: number;
  beneficioSi100k: number;
}

export function computeMetrics(reg: RegistroProfit | null): ProfitMetrics {
  const empty: ProfitMetrics = {
    ventas: 0,
    compras: 0,
    personal: 0,
    alquiler: 0,
    suministros: 0,
    gestoria: 0,
    otros: 0,
    alquilerImpuestos: 0,
    totalCostes: 0,
    costesFijos: 0,
    beneficioBruto: 0,
    beneficioNeto: 0,
    margenNetoPct: 0,
    costePersonalPct: 0,
    costeComidaPct: 0,
    puntoEquilibrio: 0,
    ventasNecesarias100k: OBJETIVO_VENTAS,
    beneficioSi100k: 0,
  };

  if (!reg || reg.ventas <= 0) return empty;

  const { ventas, compras, personal, alquiler, suministros, gestoria, otros } = reg;
  const alquilerImpuestos = fmtNum(alquiler + gestoria);
  const costesFijos = fmtNum(personal + alquiler + suministros + gestoria + otros);
  const totalCostes = fmtNum(compras + costesFijos);
  const beneficioBruto = fmtNum(ventas - compras);
  const beneficioNeto = fmtNum(ventas - totalCostes);

  const margenNetoPct = fmtNum((beneficioNeto / ventas) * 100, 1);
  const costePersonalPct = fmtNum((personal / ventas) * 100, 1);
  const costeComidaPct = fmtNum((compras / ventas) * 100, 1);

  const variableRatio = compras / ventas;
  const puntoEquilibrio =
    variableRatio < 1 && costesFijos > 0
      ? fmtNum(costesFijos / (1 - variableRatio), 0)
      : 0;

  const ventasNecesarias100k = fmtNum(Math.max(0, OBJETIVO_VENTAS - ventas), 0);
  const comprasEscaladas =
    ventas > 0 ? fmtNum(compras * (OBJETIVO_VENTAS / ventas)) : compras;
  const beneficioSi100k = fmtNum(
    OBJETIVO_VENTAS - comprasEscaladas - costesFijos,
    0,
  );

  return {
    ventas,
    compras,
    personal,
    alquiler,
    suministros,
    gestoria,
    otros,
    alquilerImpuestos,
    totalCostes,
    costesFijos,
    beneficioBruto,
    beneficioNeto,
    margenNetoPct,
    costePersonalPct,
    costeComidaPct,
    puntoEquilibrio,
    ventasNecesarias100k,
    beneficioSi100k,
  };
}

export interface SugerenciaAI {
  id: string;
  tipo: "success" | "warning" | "info" | "danger";
  titulo: string;
  mensaje: string;
}

export function generarSugerenciasAI(m: ProfitMetrics): SugerenciaAI[] {
  const sugerencias: SugerenciaAI[] = [];

  if (m.ventas <= 0) return sugerencias;

  sugerencias.push({
    id: "personal-pct",
    tipo: m.costePersonalPct > 35 ? "warning" : "info",
    titulo: "Coste de personal",
    mensaje: `Con ventas actuales de ${m.ventas.toLocaleString("es-ES")} €, el coste de personal representa el ${m.costePersonalPct}%. Si llegas a 100.000 € sin aumentar personal, el margen neto pasaría del ${m.margenNetoPct}% al ${fmtNum((m.beneficioSi100k / OBJETIVO_VENTAS) * 100, 1)}%.`,
  });

  if (m.beneficioNeto > 0) {
    sugerencias.push({
      id: "beneficio-positivo",
      tipo: "success",
      titulo: "Beneficio neto positivo",
      mensaje: `El mes cierra con ${m.beneficioNeto.toLocaleString("es-ES")} € de beneficio neto (margen ${m.margenNetoPct}%). Beneficio bruto: ${m.beneficioBruto.toLocaleString("es-ES")} € tras descontar compras.`,
    });
  } else {
    sugerencias.push({
      id: "beneficio-negativo",
      tipo: "danger",
      titulo: "Beneficio neto negativo",
      mensaje: `Pérdida estimada de ${Math.abs(m.beneficioNeto).toLocaleString("es-ES")} €. Revisa costes fijos (${m.costesFijos.toLocaleString("es-ES")} €) y ratio de compras (${m.costeComidaPct}%).`,
    });
  }

  if (m.costeComidaPct > 30) {
    sugerencias.push({
      id: "comida-alta",
      tipo: "warning",
      titulo: "Coste de comida elevado",
      mensaje: `Las compras suponen el ${m.costeComidaPct}% de las ventas (objetivo hostelería ~28-30%). Negocia con proveedores o revisa mermas y escandallos.`,
    });
  } else {
    sugerencias.push({
      id: "comida-ok",
      tipo: "success",
      titulo: "Coste de comida controlado",
      mensaje: `El coste de comida (${m.costeComidaPct}%) está en rango saludable para restauración.`,
    });
  }

  if (m.ventasNecesarias100k > 0) {
    sugerencias.push({
      id: "objetivo-100k",
      tipo: "info",
      titulo: "Camino a 100.000 €",
      mensaje: `Faltan ${m.ventasNecesarias100k.toLocaleString("es-ES")} € para alcanzar 100.000 € de ventas. Beneficio estimado en ese escenario: ${m.beneficioSi100k.toLocaleString("es-ES")} € (compras escaladas, costes fijos constantes).`,
    });
  } else {
    sugerencias.push({
      id: "objetivo-alcanzado",
      tipo: "success",
      titulo: "Objetivo de ventas superado",
      mensaje: `Has superado los 100.000 € de ventas. Beneficio neto estimado a esa escala: ${m.beneficioSi100k.toLocaleString("es-ES")} €.`,
    });
  }

  if (m.puntoEquilibrio > 0) {
    const sobreEquilibrio = m.ventas >= m.puntoEquilibrio;
    sugerencias.push({
      id: "punto-equilibrio",
      tipo: sobreEquilibrio ? "info" : "danger",
      titulo: "Punto de equilibrio",
      mensaje: sobreEquilibrio
        ? `Con ${m.ventas.toLocaleString("es-ES")} € superas el punto de equilibrio (${m.puntoEquilibrio.toLocaleString("es-ES")} €). Cada euro extra mejora directamente el beneficio.`
        : `Necesitas ${m.puntoEquilibrio.toLocaleString("es-ES")} € para cubrir costes. Actualmente estás ${fmtNum(m.puntoEquilibrio - m.ventas, 0).toLocaleString("es-ES")} € por debajo.`,
    });
  }

  if (m.alquilerImpuestos / m.ventas > 0.12) {
    sugerencias.push({
      id: "alquiler-alto",
      tipo: "warning",
      titulo: "Alquiler + gestoría",
      mensaje: `Alquiler e impuestos/gestoría suman ${m.alquilerImpuestos.toLocaleString("es-ES")} € (${fmtNum((m.alquilerImpuestos / m.ventas) * 100, 1)}% de ventas). Valora renegociar o optimizar horarios.`,
    });
  }

  return sugerencias;
}

export const EMPTY_PROFIT_FORM = {
  mes: new Date().toISOString().slice(0, 7),
  ventas: "",
  compras: "",
  personal: "",
  alquiler: "",
  suministros: "",
  gestoria: "",
  otros: "",
};

export type ProfitForm = typeof EMPTY_PROFIT_FORM;

export function registroToForm(r: RegistroProfit): ProfitForm {
  return {
    mes: r.mes,
    ventas: String(r.ventas),
    compras: String(r.compras),
    personal: String(r.personal),
    alquiler: String(r.alquiler),
    suministros: String(r.suministros),
    gestoria: String(r.gestoria),
    otros: String(r.otros),
  };
}

export function parseProfitForm(form: ProfitForm): Omit<RegistroProfit, "id"> | null {
  const mes = form.mes.slice(0, 7);
  if (!mes || mes.length < 7) return null;

  const ventas = fmtNum(parseFloat(form.ventas) || 0);
  if (ventas <= 0) return null;

  return {
    mes,
    ventas,
    compras: fmtNum(parseFloat(form.compras) || 0),
    personal: fmtNum(parseFloat(form.personal) || 0),
    alquiler: fmtNum(parseFloat(form.alquiler) || 0),
    suministros: fmtNum(parseFloat(form.suministros) || 0),
    gestoria: fmtNum(parseFloat(form.gestoria) || 0),
    otros: fmtNum(parseFloat(form.otros) || 0),
  };
}
