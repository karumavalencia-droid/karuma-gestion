/**
 * Inbox — adaptador `manual`.
 *
 * No corresponde a ninguna plataforma real: existe para poder ejercitar TODO
 * el sistema (ingesta, deduplicación, reglas, IA, bandeja, respuesta) sin
 * depender del App Review de Meta ni de la aprobación de Google, que son el
 * camino crítico del proyecto.
 *
 * Se alimenta desde `POST /api/inbox/manual` (solo owner).
 */

import type { PlatformAdapter } from "./types";
import type { InboxKind, NormalizedItem } from "../types";

const TIPOS: InboxKind[] = ["dm", "comment", "mention", "story_reply", "review", "question"];

/** Lo que acepta el endpoint de pruebas. */
export type EntradaManual = {
  threadId?: string;
  kind?: string;
  body?: string;
  customerName?: string;
  customerUsername?: string;
  rating?: number;
  sentAt?: string;
};

export const manualAdapter: PlatformAdapter = {
  platform: "manual",
  label: "Pruebas",
  canReply: true,

  normalize(raw: unknown): NormalizedItem[] {
    const entrada = (raw ?? {}) as EntradaManual;
    const body = typeof entrada.body === "string" ? entrada.body.trim() : "";
    if (!body) return [];

    const kind: InboxKind = TIPOS.includes(entrada.kind as InboxKind)
      ? (entrada.kind as InboxKind)
      : "dm";

    const rating =
      typeof entrada.rating === "number" && entrada.rating >= 1 && entrada.rating <= 5
        ? Math.round(entrada.rating)
        : null;

    // Sin threadId explícito, cada mensaje es su propio hilo. El id lleva el
    // cuerpo para que reenviar lo mismo sea idempotente, igual que un webhook.
    const externalThreadId =
      entrada.threadId?.trim() || `manual:${hash(`${kind}|${body}|${entrada.customerName ?? ""}`)}`;

    const sentAt = entrada.sentAt ?? new Date().toISOString();

    return [
      {
        platform: "manual",
        kind,
        externalThreadId,
        externalMessageId: `${externalThreadId}:${hash(`${body}|${sentAt}`)}`,
        direction: "in",
        customerExternalId: entrada.customerUsername ?? null,
        customerName: entrada.customerName ?? "Cliente de prueba",
        customerUsername: entrada.customerUsername ?? null,
        customerAvatarUrl: null,
        body,
        rating,
        permalink: null,
        sentAt,
        raw: entrada,
      },
    ];
  },

  async reply() {
    // El adaptador de pruebas no envía a ningún sitio: la ingesta guarda el
    // mensaje saliente igual que haría con una plataforma real.
    return {};
  },

  permalink() {
    return null;
  },
};

/** Hash corto y estable (FNV-1a). No es criptográfico: solo genera ids. */
function hash(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}
