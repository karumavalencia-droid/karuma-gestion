/**
 * Inbox — publicar una respuesta.
 *
 * Un único camino de salida: lo usan el botón de la interfaz y la respuesta
 * automática. Dos copias de "envía y registra" es como se acaba teniendo un
 * hilo marcado como respondido cuando en realidad no salió nada.
 *
 * Orden deliberado: primero se envía por el adaptador y solo si eso funciona se
 * toca la base de datos. Al revés quedaría el hilo en "respondido" con el
 * cliente esperando.
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAdapter } from "./adapters";
import type { InboxPlatform } from "./types";

export const LARGO_MAXIMO_RESPUESTA = 4000;

export type ResultadoEnvio =
  | { ok: true; enviadoEn: string }
  | { ok: false; status: number; error: string; permalink?: string | null };

export async function enviarRespuesta(input: {
  threadId: string;
  texto: string;
  /** Nombre que queda en el mensaje saliente. */
  autor: string;
  /** Email de quien responde. null en las respuestas automáticas. */
  autorEmail?: string | null;
  sugerenciaId?: string | null;
}): Promise<ResultadoEnvio> {
  const texto = input.texto.trim();
  if (!texto) return { ok: false, status: 400, error: "La respuesta está vacía" };
  if (texto.length > LARGO_MAXIMO_RESPUESTA) {
    return { ok: false, status: 400, error: "La respuesta es demasiado larga" };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return { ok: false, status: 503, error: "Base de datos no configurada" };

  const { data: thread } = await supabase
    .from("inbox_threads")
    .select("*")
    .eq("id", input.threadId)
    .maybeSingle();

  if (!thread) return { ok: false, status: 404, error: "Hilo no encontrado" };

  const adapter = getAdapter(thread.platform as InboxPlatform);
  if (!adapter) {
    return {
      ok: false,
      status: 501,
      error: `Todavía no hay integración con ${thread.platform}`,
    };
  }

  // Tripadvisor: su API no deja responder. La interfaz ofrece copiar y abrir.
  if (!adapter.canReply || !adapter.reply) {
    return {
      ok: false,
      status: 409,
      error: `${adapter.label} no permite responder desde aquí`,
      permalink: thread.permalink,
    };
  }

  let externalId: string | undefined;
  try {
    const envio = await adapter.reply(thread as never, texto);
    externalId = envio.externalId;
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: error instanceof Error ? error.message : "No se pudo enviar la respuesta",
    };
  }

  const ahora = new Date().toISOString();

  const { error: errorMensaje } = await supabase.from("inbox_messages").insert({
    thread_id: input.threadId,
    platform: thread.platform,
    direction: "out",
    external_id: externalId ?? null,
    author_name: input.autor,
    body: texto,
    sent_at: ahora,
  });

  if (errorMensaje) {
    // Ya está publicado fuera: no se puede deshacer, así que se avisa fuerte en
    // vez de fingir que no pasó nada.
    console.error("[inbox] respuesta publicada pero no registrada:", errorMensaje.message);
    return { ok: false, status: 500, error: errorMensaje.message };
  }

  await supabase
    .from("inbox_threads")
    .update({
      replied: true,
      replied_at: ahora,
      replied_by: input.autorEmail ?? null,
      status: "respondido",
      unread: false,
      last_message_at: ahora,
      updated_at: ahora,
    })
    .eq("id", input.threadId);

  if (input.sugerenciaId) {
    await supabase
      .from("inbox_ai_suggestions")
      .update({ used: true })
      .eq("id", input.sugerenciaId)
      .eq("thread_id", input.threadId);
  }

  return { ok: true, enviadoEn: ahora };
}
