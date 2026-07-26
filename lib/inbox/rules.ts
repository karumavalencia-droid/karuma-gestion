/**
 * Inbox — clasificación por reglas.
 *
 * Va SIEMPRE antes que la IA: es determinista, gratis y no falla. La IA solo
 * enriquece después, y nunca puede bajar la prioridad que se decide aquí.
 *
 * Módulo puro (sin red ni base de datos) para poder probarlo entero:
 * `npm run test:inbox`.
 */

import type { Analisis, InboxPriority, Intencion } from "./types";

const ORDEN_PRIORIDAD: InboxPriority[] = ["baja", "normal", "alta", "urgente"];

/** Devuelve la más alta de las dos prioridades. */
export function maxPrioridad(a: InboxPriority, b: InboxPriority): InboxPriority {
  return ORDEN_PRIORIDAD.indexOf(a) >= ORDEN_PRIORIDAD.indexOf(b) ? a : b;
}

/** Minúsculas y sin acentos, para que "alergía" y "ALERGIA" caigan igual. */
export function normalizar(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Palabras que disparan intención y prioridad, en los idiomas que atendemos.
 * `alergia` es la máxima: es seguridad alimentaria, no atención al cliente.
 */
const REGLAS: { intencion: Intencion; prioridad: InboxPriority; palabras: string[] }[] = [
  {
    intencion: "alergia",
    prioridad: "urgente",
    palabras: ["alergia", "alergico", "alergica", "intolerancia", "celiaco", "sin gluten",
      "allergy", "allergic", "gluten free", "过敏", "allergie"],
  },
  {
    intencion: "queja",
    prioridad: "urgente",
    palabras: ["urgente", "queja", "reclamacion", "fatal", "pesimo", "horrible",
      "urgent", "complaint", "terrible", "awful", "投诉", "很差", "plainte"],
  },
  {
    intencion: "grupo",
    prioridad: "alta",
    palabras: ["grupo", "cumpleanos", "cumple", "evento", "celebracion", "despedida",
      "group", "birthday", "event", "生日", "聚会", "anniversaire"],
  },
  {
    intencion: "reserva",
    prioridad: "alta",
    palabras: ["reserva", "reservar", "mesa", "book", "booking", "table", "reservation",
      "订位", "预订", "réservation", "reserver"],
  },
  {
    intencion: "precio",
    prioridad: "normal",
    palabras: ["precio", "cuanto cuesta", "cuanto vale", "menu del dia", "tarifa",
      "price", "how much", "cost", "价格", "多少钱", "prix"],
  },
  {
    intencion: "horario",
    prioridad: "normal",
    palabras: ["horario", "abierto", "abren", "cierran", "a que hora",
      "opening", "open", "close", "what time", "营业时间", "几点", "horaire"],
  },
  {
    intencion: "elogio",
    prioridad: "baja",
    palabras: ["gracias", "excelente", "increible", "delicioso", "maravilloso",
      "thank", "excellent", "amazing", "delicious", "谢谢", "好吃", "merci"],
  },
];

/**
 * Idioma por heurística, para cuando la IA no está disponible. Es un respaldo
 * deliberadamente simple: la detección buena la hace la IA.
 */
export function detectarIdioma(texto: string): string {
  if (/[\u4e00-\u9fff]/.test(texto)) return "zh";

  const t = normalizar(texto);
  const marcadores: Record<string, RegExp> = {
    es: /\b(hola|gracias|quiero|reserva|mesa|para|buenos dias|cuanto|por favor)\b/,
    // Sin "table": la comparte con el inglés y se llevaría los mensajes ingleses.
    fr: /\b(bonjour|merci|je voudrais|s'il vous plait|combien|nous sommes)\b/,
    en: /\b(hello|hi|thanks|thank you|i would like|table|how much|please)\b/,
  };
  for (const [idioma, patron] of Object.entries(marcadores)) {
    if (patron.test(t)) return idioma;
  }
  return "es";
}

/**
 * Clasifica un mensaje entrante sin llamar a nadie.
 *
 * @param texto  cuerpo del mensaje
 * @param rating estrellas, si es una reseña
 */
export function clasificarPorReglas(texto: string, rating?: number | null): Analisis {
  const t = normalizar(texto ?? "");
  const intents = new Set<Intencion>();
  let prioridad: InboxPriority = "normal";

  for (const regla of REGLAS) {
    if (regla.palabras.some((palabra) => t.includes(normalizar(palabra)))) {
      intents.add(regla.intencion);
      prioridad = maxPrioridad(prioridad, regla.prioridad);
    }
  }

  // Una reseña mala es una queja aunque no use ninguna palabra de la lista.
  let esQueja = intents.has("queja");
  let sentimiento: number | null = null;
  if (typeof rating === "number") {
    sentimiento = (rating - 3) / 2; // 1★ → -1, 3★ → 0, 5★ → 1
    if (rating <= 2) {
      esQueja = true;
      intents.add("queja");
      prioridad = maxPrioridad(prioridad, "urgente");
    } else if (rating === 3) {
      prioridad = maxPrioridad(prioridad, "alta");
    }
  }

  if (intents.size === 0) intents.add("otro");

  return {
    language: detectarIdioma(texto ?? ""),
    sentiment: sentimiento,
    isComplaint: esQueja,
    intents: [...intents],
    priority: prioridad,
  };
}

/**
 * Funde el análisis de la IA sobre el de reglas. La IA puede aportar idioma,
 * sentimiento e intenciones nuevas, y SUBIR la prioridad — nunca bajarla.
 */
export function fundirAnalisis(reglas: Analisis, ia: Partial<Analisis>): Analisis {
  return {
    language: ia.language || reglas.language,
    sentiment: typeof ia.sentiment === "number" ? ia.sentiment : reglas.sentiment,
    isComplaint: reglas.isComplaint || Boolean(ia.isComplaint),
    intents: [...new Set([...reglas.intents, ...(ia.intents ?? [])])],
    priority: ia.priority ? maxPrioridad(reglas.priority, ia.priority) : reglas.priority,
  };
}

/**
 * Estado del SLA de respuesta. Se calcula en el cliente a partir de
 * `first_inbound_at`: no hace falta ningún proceso periódico (y en el plan
 * Hobby de Vercel los crons tienen una ventana de 1 h, así que tampoco serviría).
 */
export function estadoSla(
  primeraEntradaIso: string | null,
  ahoraMs: number,
  avisoMin = 30,
  urgenteMin = 60,
): "ok" | "aviso" | "urgente" {
  if (!primeraEntradaIso) return "ok";
  const minutos = (ahoraMs - new Date(primeraEntradaIso).getTime()) / 60000;
  if (minutos >= urgenteMin) return "urgente";
  if (minutos >= avisoMin) return "aviso";
  return "ok";
}
