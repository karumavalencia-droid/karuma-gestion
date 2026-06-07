import { FoodCostStore, RegistroFoodCost } from "@/lib/types";

export const STORAGE_KEY = "karuma_food_cost_v1";
export const OBJETIVO_FOOD_COST_DEFAULT = 28;
export const PROYECCION_VENTAS = 100_000;

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

function seedRegistros(): RegistroFoodCost[] {
  return [
    {
      id: "foodcost-2026-06",
      mes: "2026-06",
      ventas: 71_734.55,
      clientes: 3_068,
      compras: 18_000,
    },
  ];
}

export function seedFoodCost(): FoodCostStore {
  return {
    objetivoFoodCostPct: OBJETIVO_FOOD_COST_DEFAULT,
    registros: seedRegistros(),
  };
}

function normalizeRegistro(raw: unknown): RegistroFoodCost | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const mes = String(r.mes ?? "").slice(0, 7);
  if (!mes || mes.length < 7) return null;

  const ventas = fmtNum(parseFloat(String(r.ventas ?? 0)) || 0);
  const compras = fmtNum(parseFloat(String(r.compras ?? 0)) || 0);
  const clientes = Math.max(0, Math.round(parseFloat(String(r.clientes ?? 0)) || 0));

  if (ventas <= 0) return null;

  return {
    id: String(r.id ?? genId()),
    mes,
    ventas,
    clientes,
    compras,
  };
}

export function loadFoodCost(): FoodCostStore {
  if (typeof window === "undefined") return seedFoodCost();

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedFoodCost();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const registros = Array.isArray(parsed.registros)
      ? parsed.registros
          .map(normalizeRegistro)
          .filter((r): r is RegistroFoodCost => r !== null)
      : [];

    const store: FoodCostStore = {
      objetivoFoodCostPct: fmtNum(
        parseFloat(String(parsed.objetivoFoodCostPct ?? OBJETIVO_FOOD_COST_DEFAULT)) ||
          OBJETIVO_FOOD_COST_DEFAULT,
        1,
      ),
      registros: registros.length > 0 ? registros : seedRegistros(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return store;
  } catch {
    const seeded = seedFoodCost();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

export function saveFoodCost(store: FoodCostStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function getRegistroMes(
  registros: RegistroFoodCost[],
  year: number,
  month: number,
): RegistroFoodCost | null {
  const key = `${year}-${String(month + 1).padStart(2, "0")}`;
  return registros.find((r) => r.mes === key) ?? null;
}

export function mesLabel(mes: string): string {
  const [y, m] = mes.split("-");
  const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
  return d.toLocaleDateString("es-ES", { month: "long", year: "numeric" });
}

export interface FoodCostMetrics {
  ventas: number;
  clientes: number;
  compras: number;
  foodCostPct: number;
  costePorCliente: number;
  objetivoFoodCostPct: number;
  diferenciaObjetivo: number;
  comprasMaxRecomendadas: number;
  ahorroNecesario: number;
  costePorClienteObjetivo: number;
  proyeccionCompras100k: number;
  proyeccionFoodCost100k: number;
  comprasObjetivo100k: number;
  excesoCompras: number;
}

export function computeMetrics(
  registro: RegistroFoodCost | null,
  objetivoFoodCostPct: number,
): FoodCostMetrics {
  const empty: FoodCostMetrics = {
    ventas: 0,
    clientes: 0,
    compras: 0,
    foodCostPct: 0,
    costePorCliente: 0,
    objetivoFoodCostPct,
    diferenciaObjetivo: 0,
    comprasMaxRecomendadas: 0,
    ahorroNecesario: 0,
    costePorClienteObjetivo: 0,
    proyeccionCompras100k: 0,
    proyeccionFoodCost100k: 0,
    comprasObjetivo100k: 0,
    excesoCompras: 0,
  };

  if (!registro || registro.ventas <= 0) return empty;

  const { ventas, clientes, compras } = registro;
  const foodCostPct = fmtNum((compras / ventas) * 100, 1);
  const costePorCliente = clientes > 0 ? fmtNum(compras / clientes) : 0;
  const diferenciaObjetivo = fmtNum(foodCostPct - objetivoFoodCostPct, 1);
  const comprasMaxRecomendadas = fmtNum(ventas * (objetivoFoodCostPct / 100));
  const ahorroNecesario = fmtNum(Math.max(0, compras - comprasMaxRecomendadas));
  const costePorClienteObjetivo =
    clientes > 0 ? fmtNum(comprasMaxRecomendadas / clientes) : 0;

  const ratioCompras = compras / ventas;
  const proyeccionCompras100k = fmtNum(PROYECCION_VENTAS * ratioCompras);
  const proyeccionFoodCost100k = fmtNum(ratioCompras * 100, 1);
  const comprasObjetivo100k = fmtNum(PROYECCION_VENTAS * (objetivoFoodCostPct / 100));
  const excesoCompras = fmtNum(Math.max(0, proyeccionCompras100k - comprasObjetivo100k));

  return {
    ventas,
    clientes,
    compras,
    foodCostPct,
    costePorCliente,
    objetivoFoodCostPct,
    diferenciaObjetivo,
    comprasMaxRecomendadas,
    ahorroNecesario,
    costePorClienteObjetivo,
    proyeccionCompras100k,
    proyeccionFoodCost100k,
    comprasObjetivo100k,
    excesoCompras,
  };
}

export type TipoAlertaFoodCost =
  | "correcto"
  | "food_cost_alto"
  | "compras_altas"
  | "coste_cliente_alto";

export interface AlertaFoodCost {
  id: TipoAlertaFoodCost;
  titulo: string;
  mensaje: string;
  tipo: "success" | "warning" | "danger" | "info";
  activa: boolean;
}

export function generarAlertas(m: FoodCostMetrics): AlertaFoodCost[] {
  if (m.ventas <= 0) return [];

  const costeClienteAlto = m.costePorCliente > m.costePorClienteObjetivo * 1.05;
  const foodCostCorrecto = m.foodCostPct <= m.objetivoFoodCostPct;
  const foodCostAlto = m.foodCostPct > m.objetivoFoodCostPct;
  const comprasAltas = m.compras > m.comprasMaxRecomendadas;

  return [
    {
      id: "correcto",
      titulo: "Food Cost correcto",
      mensaje: foodCostCorrecto
        ? `Food Cost del ${m.foodCostPct}% — dentro del objetivo del ${m.objetivoFoodCostPct}%. Buffet bajo control.`
        : `Food Cost del ${m.foodCostPct}% — por encima del objetivo. Revisa compras y mermas.`,
      tipo: foodCostCorrecto ? "success" : "info",
      activa: foodCostCorrecto,
    },
    {
      id: "food_cost_alto",
      titulo: "Food Cost alto",
      mensaje: foodCostAlto
        ? `El ${m.foodCostPct}% supera el objetivo en ${m.diferenciaObjetivo} puntos. Necesitas ahorrar ${m.ahorroNecesario.toLocaleString("es-ES")} € en compras.`
        : `Food Cost controlado (${m.foodCostPct}% vs ${m.objetivoFoodCostPct}% objetivo).`,
      tipo: foodCostAlto ? "danger" : "success",
      activa: foodCostAlto,
    },
    {
      id: "compras_altas",
      titulo: "Compras demasiado altas",
      mensaje: comprasAltas
        ? `Compras de ${m.compras.toLocaleString("es-ES")} € superan el máximo recomendado de ${m.comprasMaxRecomendadas.toLocaleString("es-ES")} € (${m.objetivoFoodCostPct}% de ventas).`
        : `Compras dentro del límite recomendado (${m.comprasMaxRecomendadas.toLocaleString("es-ES")} € máx.).`,
      tipo: comprasAltas ? "warning" : "success",
      activa: comprasAltas,
    },
    {
      id: "coste_cliente_alto",
      titulo: "Coste por cliente alto",
      mensaje: costeClienteAlto
        ? `Coste comida ${m.costePorCliente.toLocaleString("es-ES")} €/cliente vs objetivo ${m.costePorClienteObjetivo.toLocaleString("es-ES")} €. Optimiza porciones del buffet.`
        : `Coste por cliente ${m.costePorCliente.toLocaleString("es-ES")} € — en línea con el objetivo.`,
      tipo: costeClienteAlto ? "warning" : "success",
      activa: costeClienteAlto,
    },
  ];
}

export interface SugerenciaAI {
  id: string;
  tipo: "success" | "warning" | "info" | "danger";
  titulo: string;
  mensaje: string;
}

export function generarSugerenciasAI(m: FoodCostMetrics): SugerenciaAI[] {
  const sugerencias: SugerenciaAI[] = [];

  if (m.ventas <= 0) return sugerencias;

  sugerencias.push({
    id: "resumen",
    tipo: m.foodCostPct <= m.objetivoFoodCostPct ? "success" : "warning",
    titulo: "Control buffet general",
    mensaje: `Con ${m.ventas.toLocaleString("es-ES")} € de ventas y ${m.compras.toLocaleString("es-ES")} € en compras, el Food Cost del buffet es ${m.foodCostPct}%. Objetivo: ${m.objetivoFoodCostPct}%.`,
  });

  sugerencias.push({
    id: "sushi",
    tipo: "info",
    titulo: "Sushi y elaboraciones",
    mensaje:
      m.foodCostPct > m.objetivoFoodCostPct
        ? "Revisa escandallos de maki y uramaki: estandariza gramos de arroz (18-22 g/pieza) y reduce sobrepeso en bandejas de buffet."
        : "Mantén fichas de coste por rollo. El control de porciones en sushi es clave para no superar el 28%.",
  });

  sugerencias.push({
    id: "salmon",
    tipo: m.foodCostPct > 30 ? "danger" : "warning",
    titulo: "Salmón",
    mensaje:
      "El salmón es el mayor driver de coste en buffet. Rota cortes según afluencia, negocia precio por volumen con Pescados del Mediterráneo y controla mermas en sashimi (>4 h fuera de cámara).",
  });

  sugerencias.push({
    id: "atun",
    tipo: "warning",
    titulo: "Atún",
    mensaje:
      "Limita atún rojo en horas valle. Usa akami en combinados de nigiri cuando el ticket medio baje de 23 € para proteger margen sin bajar percepción de calidad.",
  });

  sugerencias.push({
    id: "arroz",
    tipo: "info",
    titulo: "Arroz sushi",
    mensaje:
      "Prepara por batches según previsión de cubiertos. 1 kg de arroz cocido rinde ~45 piezas. Evita tirar arroz >2 h — representa hasta 2 puntos de Food Cost en días flojos.",
  });

  sugerencias.push({
    id: "bebida",
    tipo: "success",
    titulo: "Bebida",
    mensaje:
      "Impulsa sake, cerveza Asahi y refrescos en sala: cada 1 € extra en bebida mejora el margen global sin subir compras de pescado. Objetivo bebida ≥15% de ventas.",
  });

  if (m.ventas < PROYECCION_VENTAS) {
    sugerencias.push({
      id: "proyeccion-100k",
      tipo: "info",
      titulo: "Proyección 100.000 €",
      mensaje: `Si llegas a 100.000 € con el Food Cost actual (${m.proyeccionFoodCost100k}%), las compras serían ~${m.proyeccionCompras100k.toLocaleString("es-ES")} €. Al 28% objetivo: ${m.comprasObjetivo100k.toLocaleString("es-ES")} € — ahorro potencial de ${m.excesoCompras.toLocaleString("es-ES")} €.`,
    });
  }

  if (m.ahorroNecesario > 0) {
    sugerencias.push({
      id: "ahorro",
      tipo: "danger",
      titulo: "Ahorro necesario",
      mensaje: `Para volver al ${m.objetivoFoodCostPct}% necesitas reducir compras en ${m.ahorroNecesario.toLocaleString("es-ES")} € este mes. Prioriza: salmón, atún y sobreproducción de arroz.`,
    });
  }

  return sugerencias;
}

export const EMPTY_FOOD_COST_FORM = {
  mes: new Date().toISOString().slice(0, 7),
  ventas: "",
  clientes: "",
  compras: "",
};

export type FoodCostForm = typeof EMPTY_FOOD_COST_FORM;

export function registroToForm(r: RegistroFoodCost): FoodCostForm {
  return {
    mes: r.mes,
    ventas: String(r.ventas),
    clientes: String(r.clientes),
    compras: String(r.compras),
  };
}

export function parseFoodCostForm(form: FoodCostForm): Omit<RegistroFoodCost, "id"> | null {
  const mes = form.mes.slice(0, 7);
  if (!mes || mes.length < 7) return null;

  const ventas = fmtNum(parseFloat(form.ventas) || 0);
  const compras = fmtNum(parseFloat(form.compras) || 0);
  const clientes = Math.max(0, Math.round(parseFloat(form.clientes) || 0));

  if (ventas <= 0) return null;

  return { mes, ventas, clientes, compras };
}
