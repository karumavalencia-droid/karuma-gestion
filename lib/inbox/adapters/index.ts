/**
 * Inbox — registro de adaptadores.
 *
 * Fase 0: solo `manual` (pruebas). Las siguientes fases añaden aquí
 * `instagram`, `google` y `tripadvisor` sin tocar nada más del sistema.
 */

import type { InboxPlatform } from "../types";
import type { PlatformAdapter } from "./types";
import { manualAdapter } from "./manual";

const ADAPTADORES: Partial<Record<InboxPlatform, PlatformAdapter>> = {
  manual: manualAdapter,
};

export function getAdapter(platform: InboxPlatform): PlatformAdapter | null {
  return ADAPTADORES[platform] ?? null;
}

export function plataformasDisponibles(): InboxPlatform[] {
  return Object.keys(ADAPTADORES) as InboxPlatform[];
}

export type { PlatformAdapter };
