/**
 * Inbox — contrato de un adaptador de plataforma.
 *
 * Es la única pieza que sabe de Instagram, Google o Tripadvisor. El resto del
 * sistema (ingesta, reglas, IA, API, interfaz) trabaja con `NormalizedItem` y
 * no distingue una plataforma de otra.
 *
 * Añadir Facebook, WhatsApp, TikTok, Email, Booking o TheFork = implementar
 * esta interfaz y registrarla en `index.ts`. Sin migraciones de estructura.
 */

import type { InboxPlatform, InboxThread, NormalizedItem } from "../types";

export interface PlatformAdapter {
  platform: InboxPlatform;

  /** Nombre para la interfaz. */
  label: string;

  /**
   * ¿Se puede responder por API?
   * Tripadvisor: false — su Content API no expone respuesta del propietario,
   * así que la interfaz ofrece "copiar y abrir" en vez de "enviar".
   */
  canReply: boolean;

  /** Evento crudo (webhook o sondeo) → items normalizados. Nunca lanza. */
  normalize(raw: unknown): NormalizedItem[];

  /** Envía la respuesta. Solo si `canReply`. */
  reply?(thread: InboxThread, texto: string): Promise<{ externalId?: string }>;

  /** Sondeo periódico o descarga de histórico. */
  fetchSince?(desde: Date): Promise<NormalizedItem[]>;

  /** Enlace a la conversación original en la plataforma. */
  permalink?(thread: InboxThread): string | null;
}
