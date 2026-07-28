/**
 * Inbox — política de respuesta automática.
 *
 * Decide si un borrador de la IA se puede publicar solo o tiene que esperar a
 * que una persona lo apruebe.
 *
 * Dos ideas que conviene no perder:
 *
 * 1. `decidir()` NO mira si la función está activada. Solo dice si el contenido
 *    es apto. Quien llama decide qué hacer con eso: publicar (activada) o
 *    guardar como simulacro (desactivada). Así se puede tener el sistema
 *    semanas en marcha enseñando qué habría publicado, sin publicar nada.
 *
 * 2. Todas las puertas son de una sola dirección: ante la duda, a revisar.
 *    Publicar una respuesta mala en una reseña pública es difícil de deshacer
 *    aunque la API permita editarla: Google avisa por email a quien escribió la
 *    reseña en el momento en que se publica.
 *
 * Función pura, sin base de datos ni red: se prueba entera desde los tests.
 */

import type { InboxKind, InboxPlatform, Intencion } from "./types";

/** Ajustes que gobiernan la publicación automática (tabla `inbox_settings`). */
export type AjustesAutoReply = {
  /** false = modo simulacro: se decide y se registra, pero no se publica. */
  activa: boolean;
  /** Estrellas mínimas para publicar sin revisión. */
  minEstrellas: number;
  /** Plataformas donde se permite publicar solo. Vacío = ninguna. */
  plataformas: InboxPlatform[];
};

export const AJUSTES_AUTO_REPLY_POR_DEFECTO: AjustesAutoReply = {
  activa: false,
  minEstrellas: 4,
  plataformas: [],
};

/** Un borrador más largo que esto es señal de que la IA se ha ido del guion. */
const LARGO_MAXIMO_BORRADOR = 600;

export type MotivoAutoReply =
  | "apta"
  | "plataforma_no_permitida"
  | "no_es_resena"
  | "sin_borrador"
  | "borrador_largo"
  | "sin_estrellas"
  | "pocas_estrellas"
  | "queja"
  | "sentimiento_negativo"
  | "prioridad_alta"
  | "tema_delicado"
  | "borrador_con_datos"
  /** No lo devuelve `decidir()`: lo pone quien intenta publicar y no lo logra. */
  | "envio_fallido";

const EXPLICACION: Record<MotivoAutoReply, string> = {
  apta: "Reseña positiva y sin temas delicados",
  plataforma_no_permitida: "La publicación automática no está permitida en esta plataforma",
  no_es_resena: "Solo se publican solas las reseñas, nunca los mensajes directos",
  sin_borrador: "La IA no ha redactado ningún borrador",
  borrador_largo: "El borrador es más largo de lo normal",
  sin_estrellas: "La reseña no trae valoración en estrellas",
  pocas_estrellas: "Tiene menos estrellas de las exigidas",
  queja: "Está marcada como queja",
  sentimiento_negativo: "El tono del cliente es negativo",
  prioridad_alta: "Está marcada como prioritaria",
  tema_delicado: "Menciona un tema que siempre ve una persona",
  borrador_con_datos: "El borrador contiene precios, horarios o teléfonos",
  envio_fallido: "No se pudo publicar automáticamente",
};

/** Intenciones que nunca se responden solas, salga lo que salga en la nota. */
const INTENCIONES_DELICADAS: Intencion[] = ["alergia", "queja"];

/**
 * Datos que la IA tiene prohibido inventar (precios, horarios, teléfonos). Si
 * aparecen en el borrador es justo el caso peligroso: o se los ha inventado, o
 * está afirmando algo concreto que nadie ha verificado.
 *
 * Los enlaces no cuentan: remitir a la web de reservas es lo que se le pide.
 */
const PATRONES_DATOS: { patron: RegExp; que: string }[] = [
  { patron: /\d[\d.,]*\s*(?:€|eur\b|euros?\b)/i, que: "precio" },
  { patron: /\b\d{1,2}[:h]\d{2}\b/i, que: "hora" },
  { patron: /(?:\+\d{1,3}[\s.-]?)?(?:\d[\s.-]?){9,}/, que: "teléfono" },
];

export type EntradaAutoReply = {
  platform: InboxPlatform;
  kind: InboxKind;
  rating: number | null | undefined;
  isComplaint: boolean;
  sentiment: number | null | undefined;
  priority: string;
  intents: Intencion[];
  /** Lo que la IA propone publicar. */
  borrador: string | null | undefined;
};

export type DecisionAutoReply = {
  /** ¿Pasa todas las puertas? No incluye si la función está activada. */
  apta: boolean;
  motivo: MotivoAutoReply;
  /** Texto en español para la interfaz. */
  explicacion: string;
};

function no(motivo: MotivoAutoReply): DecisionAutoReply {
  return { apta: false, motivo, explicacion: EXPLICACION[motivo] };
}

/**
 * ¿Se puede publicar este borrador sin que lo vea nadie?
 *
 * El orden importa poco para el resultado, pero sí para el motivo que se
 * guarda: van primero las razones estructurales (plataforma, tipo, borrador) y
 * después las de contenido, que es lo que interesa leer en el simulacro.
 */
export function decidir(
  entrada: EntradaAutoReply,
  ajustes: AjustesAutoReply,
): DecisionAutoReply {
  if (!ajustes.plataformas.includes(entrada.platform)) {
    return no("plataforma_no_permitida");
  }

  // Un mensaje directo o un comentario es una conversación: contestarlo solo
  // es otra decisión, mucho mayor, y no es la que se ha tomado aquí.
  if (entrada.kind !== "review") return no("no_es_resena");

  const borrador = entrada.borrador?.trim() ?? "";
  if (!borrador) return no("sin_borrador");
  if (borrador.length > LARGO_MAXIMO_BORRADOR) return no("borrador_largo");

  if (typeof entrada.rating !== "number") return no("sin_estrellas");
  if (entrada.rating < ajustes.minEstrellas) return no("pocas_estrellas");

  // Cinco estrellas y una queja dentro es un caso real, no una rareza.
  if (entrada.isComplaint) return no("queja");
  if (typeof entrada.sentiment === "number" && entrada.sentiment < 0) {
    return no("sentimiento_negativo");
  }
  if (entrada.priority === "alta" || entrada.priority === "urgente") {
    return no("prioridad_alta");
  }
  if (entrada.intents.some((i) => INTENCIONES_DELICADAS.includes(i))) {
    return no("tema_delicado");
  }

  if (PATRONES_DATOS.some(({ patron }) => patron.test(borrador))) {
    return no("borrador_con_datos");
  }

  return { apta: true, motivo: "apta", explicacion: EXPLICACION.apta };
}

/**
 * Qué se guarda en `inbox_ai_suggestions.auto_decision`:
 *
 * - `revisar`  — no es apta: espera a una persona
 * - `simulada` — es apta, pero la función está desactivada: no se ha publicado
 * - `enviada`  — es apta y se ha publicado de verdad
 *
 * El paso de `simulada` a `enviada` lo da quien consigue publicar, no esta
 * capa: si el envío falla, la decisión NO es `enviada`.
 */
export type ResultadoAutoReply = "enviada" | "simulada" | "revisar";

/** Texto corto para la interfaz. */
export function explicarResultado(resultado: ResultadoAutoReply, motivo: string): string {
  const detalle = EXPLICACION[motivo as MotivoAutoReply] ?? motivo;
  if (resultado === "enviada") return `Publicada automáticamente · ${detalle}`;
  if (resultado === "simulada") return `Se habría publicado sola · ${detalle}`;
  return `A revisar · ${detalle}`;
}
