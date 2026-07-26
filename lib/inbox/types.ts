/**
 * Inbox — modelo único de mensaje.
 *
 * Todas las plataformas se normalizan a estos tipos. Añadir una plataforma
 * nueva no cambia nada de aquí salvo un valor en `InboxPlatform`.
 * Ver INBOX_DISENO.md.
 */

export const INBOX_PLATFORMS = [
  "instagram",
  "google",
  "tripadvisor",
  "facebook",
  "whatsapp",
  "tiktok",
  "email",
  "booking",
  "thefork",
  "manual",
] as const;
export type InboxPlatform = (typeof INBOX_PLATFORMS)[number];

/** Plataformas con adaptador implementado hoy. */
export const PLATAFORMAS_ACTIVAS: InboxPlatform[] = ["manual"];

export type InboxKind = "dm" | "comment" | "mention" | "story_reply" | "review" | "question";
export type InboxDirection = "in" | "out";
export type InboxStatus = "nuevo" | "en_curso" | "respondido" | "cerrado" | "ignorado";
export type InboxPriority = "baja" | "normal" | "alta" | "urgente";

/** Idiomas que el Inbox sabe responder. El resto cae a español. */
export const IDIOMAS_INBOX = ["es", "en", "zh", "fr"] as const;
export type IdiomaInbox = (typeof IDIOMAS_INBOX)[number];

/** Intenciones que se detectan por reglas y/o IA. */
export const INTENCIONES = [
  "reserva",
  "precio",
  "horario",
  "queja",
  "alergia",
  "grupo",
  "elogio",
  "otro",
] as const;
export type Intencion = (typeof INTENCIONES)[number];

/**
 * Lo que devuelve un adaptador al normalizar un evento. Es la única forma en
 * que entra información al Inbox, venga de un webhook o de un sondeo.
 */
export type NormalizedItem = {
  platform: InboxPlatform;
  kind: InboxKind;
  /** Id de la conversación/reseña en la plataforma. Clave de deduplicación. */
  externalThreadId: string;
  /** Id del mensaje concreto. Si falta, se deriva del hilo + fecha. */
  externalMessageId?: string | null;
  direction: InboxDirection;

  customerExternalId?: string | null;
  customerName?: string | null;
  customerUsername?: string | null;
  customerAvatarUrl?: string | null;

  body: string;
  /** Estrellas, solo en reseñas. */
  rating?: number | null;
  attachments?: unknown[];
  permalink?: string | null;
  /** Hora de la plataforma. Si falta se usa la de recepción. */
  sentAt?: string | null;
  raw?: unknown;
};

export type InboxThread = {
  id: string;
  accountId: string | null;
  platform: InboxPlatform;
  kind: InboxKind;
  externalThreadId: string;
  customerName: string | null;
  customerUsername: string | null;
  customerAvatarUrl: string | null;
  language: string | null;
  rating: number | null;
  sentiment: number | null;
  intents: string[];
  isComplaint: boolean;
  status: InboxStatus;
  priority: InboxPriority;
  unread: boolean;
  firstInboundAt: string | null;
  lastInboundAt: string | null;
  lastMessageAt: string | null;
  replied: boolean;
  repliedAt: string | null;
  permalink: string | null;
};

export type InboxMessage = {
  id: string;
  threadId: string;
  direction: InboxDirection;
  authorName: string | null;
  body: string | null;
  attachments: unknown[];
  sentAt: string | null;
  receivedAt: string;
};

/** Análisis de un mensaje entrante: por reglas, enriquecido por IA. */
export type Analisis = {
  language: string;
  sentiment: number | null;
  isComplaint: boolean;
  intents: Intencion[];
  priority: InboxPriority;
};

export type SugerenciaIa = Analisis & {
  model: string;
  reply: string;
};
