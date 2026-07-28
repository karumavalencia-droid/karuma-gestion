/**
 * Inbox — lectura de `inbox_settings`.
 *
 * Una sola fila (`id = true`). Si la tabla no está o la migración 039 no se ha
 * aplicado todavía, se devuelven los valores por defecto, que son los
 * conservadores: la respuesta automática viene DESACTIVADA.
 *
 * Ese detalle importa: un fallo leyendo los ajustes nunca puede acabar
 * publicando cosas solo.
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  AJUSTES_AUTO_REPLY_POR_DEFECTO,
  type AjustesAutoReply,
} from "./auto-reply";
import { INBOX_PLATFORMS, type InboxPlatform } from "./types";

function plataformasValidas(valor: unknown): InboxPlatform[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((p): p is InboxPlatform =>
    typeof p === "string" && (INBOX_PLATFORMS as readonly string[]).includes(p),
  );
}

export async function leerAjustesAutoReply(): Promise<AjustesAutoReply> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return AJUSTES_AUTO_REPLY_POR_DEFECTO;

  const { data, error } = await supabase
    .from("inbox_settings")
    .select("auto_reply_activa, auto_reply_min_estrellas, auto_reply_plataformas")
    .eq("id", true)
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("[inbox] no se pudieron leer los ajustes:", error.message);
    return AJUSTES_AUTO_REPLY_POR_DEFECTO;
  }

  const minEstrellas = Number(data.auto_reply_min_estrellas);

  return {
    activa: data.auto_reply_activa === true,
    minEstrellas:
      Number.isInteger(minEstrellas) && minEstrellas >= 1 && minEstrellas <= 5
        ? minEstrellas
        : AJUSTES_AUTO_REPLY_POR_DEFECTO.minEstrellas,
    plataformas: plataformasValidas(data.auto_reply_plataformas),
  };
}
