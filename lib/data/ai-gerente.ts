export type NivelRiesgo = "bajo" | "medio" | "alto";

export type TipoAlertaIA =
  | "stock_bajo"
  | "producto_critico"
  | "gasto_alto"
  | "personal_insuficiente"
  | "delivery_bajo";

export interface ResumenDiaIA {
  ventasEstimadas: number;
  clientesEstimados: number;
  ticketMedio: number;
  pedidosDelivery: number;
  nivelRiesgo: NivelRiesgo;
  resumenTexto: string;
}

export interface AlertaInteligente {
  id: string;
  tipo: TipoAlertaIA;
  titulo: string;
  mensaje: string;
  prioridad: "alta" | "media";
}

export interface RecomendacionIA {
  id: string;
  texto: string;
  impacto: "alto" | "medio";
}

export const resumenDiaIA: ResumenDiaIA = {
  ventasEstimadas: 2847.6,
  clientesEstimados: 142,
  ticketMedio: 20.05,
  pedidosDelivery: 32,
  nivelRiesgo: "medio",
  resumenTexto:
    "Viernes con buena afluencia en sala. El delivery va estable, pero el salmón y el atún requieren atención antes del servicio de noche.",
};

export const alertasInteligentes: AlertaInteligente[] = [
  {
    id: "1",
    tipo: "stock_bajo",
    titulo: "Stock bajo",
    mensaje: "Salmón fresco: 8 kg (mínimo 10 kg). Aguacate y vinagre de arroz también por debajo.",
    prioridad: "alta",
  },
  {
    id: "2",
    tipo: "producto_critico",
    titulo: "Producto crítico",
    mensaje: "Atún rojo en 3 kg — riesgo de quedarte sin nigiri y sashimi esta noche.",
    prioridad: "alta",
  },
  {
    id: "3",
    tipo: "gasto_alto",
    titulo: "Gasto alto",
    mensaje: "Comisiones delivery acumuladas: 3.421 € este mes (+8 % vs objetivo).",
    prioridad: "media",
  },
  {
    id: "4",
    tipo: "personal_insuficiente",
    titulo: "Personal insuficiente",
    mensaje: "Solo 2 personas en sushi para el turno de noche. Laura sigue de vacaciones.",
    prioridad: "media",
  },
  {
    id: "5",
    tipo: "delivery_bajo",
    titulo: "Delivery bajo",
    mensaje: "Just Eat lleva 4 pedidos menos que el viernes pasado a esta hora.",
    prioridad: "media",
  },
];

export const recomendacionesIA: RecomendacionIA[] = [
  {
    id: "1",
    texto: "Revisar stock de salmón — pedir 12 kg a Pescados del Mediterráneo antes de las 17:00.",
    impacto: "alto",
  },
  {
    id: "2",
    texto: "Preparar más arroz sushi antes de la noche — objetivo 25 kg, ahora llevas 18 kg.",
    impacto: "alto",
  },
  {
    id: "3",
    texto: "Activar promoción en Uber Eats (2x1 en California Roll) para impulsar el delivery del fin de semana.",
    impacto: "medio",
  },
  {
    id: "4",
    texto: "Controlar coste de bebida — el consumo de cerveza Asahi subió un 14 % respecto al miércoles.",
    impacto: "medio",
  },
];

export const preguntasRapidas = [
  "¿Cómo va el día?",
  "¿Qué tengo que comprar?",
  "¿Dónde estoy perdiendo dinero?",
  "¿Qué debo preparar para esta noche?",
] as const;

const respuestasRapidas: Record<(typeof preguntasRapidas)[number], string> = {
  "¿Cómo va el día?":
    "Hoy llevas unas ventas estimadas de 2.847,60 € con 142 clientes y ticket medio de 20,05 €. El delivery suma 32 pedidos. El nivel de riesgo es medio: sala va bien, pero salmón y atún están justos para la noche.",
  "¿Qué tengo que comprar?":
    "Prioridad hoy: salmón fresco (12 kg), atún rojo (8 kg), aguacate (25 uds) y alga nori (200 hojas). También conviene reponer vinagre de arroz y sésamo tostado antes del fin de semana.",
  "¿Dónde estoy perdiendo dinero?":
    "Los tres focos principales son: comisiones delivery (3.421 €/mes), mermas en pescado por rotación lenta del atún, y sobreconsumo de bebida (Asahi +14 %). Revisar fichas de coste en bebidas y ajustar promos delivery.",
  "¿Qué debo preparar para esta noche?":
    "Para el servicio de noche: 25 kg de arroz sushi, 10 kg de salmón cortado, 6 kg de atún, 12 kg de pollo teriyaki y 5 kg de sepia. Refuerza el turno de sushi si puedes — ahora solo hay 2 personas.",
};

function respuestaPorPalabras(pregunta: string): string | null {
  const q = pregunta.toLowerCase();

  if (q.includes("venta") || q.includes("factur") || q.includes("ingreso")) {
    return "Las ventas estimadas de hoy rondan los 2.847,60 € (+12,4 % vs ayer). El buffet mediodía sigue siendo el principal motor, seguido del California Roll y el nigiri de salmón.";
  }
  if (q.includes("salmón") || q.includes("salmon")) {
    return "El salmón está por debajo del mínimo: 8 kg disponibles frente a 10 kg recomendados. Con la demanda del viernes noche, te quedarás corto en unas 3 horas si no repone.";
  }
  if (q.includes("atún") || q.includes("atun")) {
    return "Atún rojo en situación crítica: 3 kg en stock. Recomiendo pedido urgente o sustituir temporalmente con atún akami en la carta de nigiri.";
  }
  if (q.includes("arroz")) {
    return "Llevas 18 kg de arroz sushi preparado. Para la noche necesitas al menos 25 kg. Activa un batch extra en los próximos 45 minutos.";
  }
  if (q.includes("personal") || q.includes("empleado") || q.includes("turno")) {
    return "Hoy hay 7 empleados activos. En sushi solo 2 para la noche — Laura está de vacaciones. Considera mover a Hiroshi del turno de tarde al cierre.";
  }
  if (q.includes("delivery") || q.includes("uber") || q.includes("glovo")) {
    return "Delivery: 32 pedidos hoy (18 Uber Eats, 14 Glovo). Just Eat va flojo. Una promo en Uber Eats podría recuperar 6-8 pedidos extra esta noche.";
  }
  if (q.includes("compra") || q.includes("proveedor") || q.includes("pedir")) {
    return "Lista de compras urgente: salmón 12 kg, atún 8 kg, aguacate 25 uds, nori 200 hojas. Proveedor recomendado: Pescados del Mediterráneo (entrega mañana si pides antes de las 17:00).";
  }
  if (q.includes("gasto") || q.includes("coste") || q.includes("dinero") || q.includes("margen")) {
    return "Gastos del mes: 41.250,80 €. Los mayores desvíos están en comisiones delivery, materia prima de pescado y bebidas. El margen estimado sigue siendo positivo: 27.169,55 €.";
  }
  if (q.includes("noche") || q.includes("preparar") || q.includes("cocina")) {
    return "Para esta noche: refuerza arroz sushi (25 kg), salmón cortado (10 kg), atún (6 kg), pollo teriyaki (12 kg) y sepia (5 kg). Revisa producción en el módulo Cocina.";
  }
  if (q.includes("promo") || q.includes("marketing")) {
    return "Sugerencia: activa la promo «2x1 Gyozas» en Glovo y un descuento del 10 % en buffet noche para walk-ins. ROI estimado positivo en fin de semana.";
  }

  return null;
}

export function getRespuestaGerente(pregunta: string): string {
  const trimmed = pregunta.trim();
  if (!trimmed) {
    return "Escribe una pregunta sobre ventas, stock, personal, delivery o costes y te responderé con un resumen basado en los datos del restaurante.";
  }

  const rapida = respuestasRapidas[trimmed as (typeof preguntasRapidas)[number]];
  if (rapida) return rapida;

  const porPalabras = respuestaPorPalabras(trimmed);
  if (porPalabras) return porPalabras;

  return `He analizado tu pregunta sobre «${trimmed}». Según los datos de hoy: ventas ~2.847 €, 142 clientes, riesgo medio por stock de pescado. Te recomiendo revisar Inventario y priorizar salmón, atún y arroz sushi antes del servicio de noche. ¿Quieres que profundice en ventas, compras o personal?`;
}

export function getEtiquetaRiesgo(nivel: NivelRiesgo): string {
  if (nivel === "bajo") return "Bajo";
  if (nivel === "medio") return "Medio";
  return "Alto";
}
