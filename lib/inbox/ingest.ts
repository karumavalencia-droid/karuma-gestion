/**
 * Inbox — motor de ingesta.
 *
 * ÚNICO punto de entrada de todo lo que llega al Inbox, venga de un webhook de
 * Instagram, de un push de Google o de un sondeo de Tripadvisor. Las reglas, la
 * deduplicación y la IA se escriben una sola vez, aquí.
 *
 * Idempotente de principio a fin: reenviar el mismo evento no crea nada nuevo.
 * Es lo que hace que los reintentos de Meta sean inofensivos.
 */

import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { DbInboxThread } from "@/lib/supabase/types";
import { analizarMensaje } from "./ai";
import { leerAjustesAutoReply } from "./ajustes";
import { decidir } from "./auto-reply";
import { enviarRespuesta } from "./enviar";
import { clasificarPorReglas } from "./rules";
import type { InboxPlatform, NormalizedItem } from "./types";

/** Nombre que queda en los mensajes que publica el sistema sin intervención. */
const AUTOR_AUTOMATICO = "Karuma (automático)";

export type ResultadoIngesta = {
  /** Mensajes nuevos que se han guardado. */
  nuevos: number;
  /** Mensajes que ya estaban (reenvíos). */
  duplicados: number;
  /** Ids de los hilos afectados. */
  threadIds: string[];
  errores: string[];
};

/** Guarda el evento crudo para poder reprocesar y depurar sin pedir nada fuera. */
export async function registrarEvento(
  platform: InboxPlatform,
  payload: unknown,
  signatureOk: boolean,
): Promise<string | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("inbox_webhook_events")
    .insert({ platform, payload: payload as never, signature_ok: signatureOk })
    .select("id")
    .single();

  if (error) {
    console.error("[inbox] no se pudo registrar el evento:", error.message);
    return null;
  }
  return data?.id ?? null;
}

/**
 * Ingesta un lote de items ya normalizados.
 *
 * @param conIa  si false, se clasifica solo por reglas (útil en pruebas y en
 *               reprocesos masivos, donde no interesa gastar en IA).
 */
export async function ingest(
  items: NormalizedItem[],
  opciones: { conIa?: boolean } = {},
): Promise<ResultadoIngesta> {
  const conIa = opciones.conIa ?? true;
  const resultado: ResultadoIngesta = { nuevos: 0, duplicados: 0, threadIds: [], errores: [] };

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    resultado.errores.push("Base de datos no configurada");
    return resultado;
  }

  for (const item of items) {
    try {
      const ahora = new Date().toISOString();
      const sentAt = item.sentAt ?? ahora;
      const entrante = item.direction === "in";

      // ── 1. Hilo: se crea si no existe, se actualiza si ya estaba ──────────
      const { data: existente } = await supabase
        .from("inbox_threads")
        .select("id, first_inbound_at, status, priority, intents")
        .eq("platform", item.platform)
        .eq("external_thread_id", item.externalThreadId)
        .maybeSingle();

      let threadId = existente?.id ?? null;

      if (!threadId) {
        const reglas = clasificarPorReglas(item.body, item.rating);
        const { data: creado, error } = await supabase
          .from("inbox_threads")
          .insert({
            platform: item.platform,
            kind: item.kind,
            external_thread_id: item.externalThreadId,
            customer_external_id: item.customerExternalId ?? null,
            customer_name: item.customerName ?? null,
            customer_username: item.customerUsername ?? null,
            customer_avatar_url: item.customerAvatarUrl ?? null,
            language: reglas.language,
            rating: item.rating ?? null,
            sentiment: reglas.sentiment,
            intents: reglas.intents,
            is_complaint: reglas.isComplaint,
            priority: reglas.priority,
            status: entrante ? "nuevo" : "respondido",
            unread: entrante,
            first_inbound_at: entrante ? sentAt : null,
            last_inbound_at: entrante ? sentAt : null,
            last_message_at: sentAt,
            permalink: item.permalink ?? null,
          })
          .select("id")
          .single();

        if (error || !creado) {
          // Carrera con otro webhook simultáneo: el índice único ya lo protege,
          // así que se relee en vez de fallar.
          const { data: recuperado } = await supabase
            .from("inbox_threads")
            .select("id")
            .eq("platform", item.platform)
            .eq("external_thread_id", item.externalThreadId)
            .maybeSingle();
          if (!recuperado) {
            resultado.errores.push(error?.message ?? "No se pudo crear el hilo");
            continue;
          }
          threadId = recuperado.id;
        } else {
          threadId = creado.id;
        }
      }

      // ── 2. Mensaje: el índice único (platform, external_id) deduplica ─────
      const externalMessageId = item.externalMessageId ?? `${item.externalThreadId}:${sentAt}`;

      const { data: yaEsta } = await supabase
        .from("inbox_messages")
        .select("id")
        .eq("platform", item.platform)
        .eq("external_id", externalMessageId)
        .maybeSingle();

      if (yaEsta) {
        resultado.duplicados += 1;
        if (!resultado.threadIds.includes(threadId)) resultado.threadIds.push(threadId);
        continue;
      }

      const { data: mensaje, error: errorMensaje } = await supabase
        .from("inbox_messages")
        .insert({
          thread_id: threadId,
          platform: item.platform,
          direction: item.direction,
          external_id: externalMessageId,
          author_name: item.customerName ?? null,
          author_username: item.customerUsername ?? null,
          body: item.body,
          attachments: (item.attachments ?? []) as never,
          raw: (item.raw ?? null) as never,
          sent_at: sentAt,
        })
        .select("id")
        .single();

      if (errorMensaje) {
        // Violación del índice único = otro proceso lo insertó primero.
        if (errorMensaje.code === "23505") {
          resultado.duplicados += 1;
          continue;
        }
        resultado.errores.push(errorMensaje.message);
        continue;
      }

      resultado.nuevos += 1;
      if (!resultado.threadIds.includes(threadId)) resultado.threadIds.push(threadId);

      // ── 3. Actualizar el hilo con este mensaje ────────────────────────────
      const parche: Partial<DbInboxThread> = {
        last_message_at: sentAt,
        updated_at: ahora,
      };
      if (entrante) {
        parche.last_inbound_at = sentAt;
        parche.unread = true;
        parche.replied = false;
        // Un mensaje nuevo del cliente reabre un hilo ya cerrado.
        parche.status = "nuevo";
        if (!existente?.first_inbound_at) parche.first_inbound_at = sentAt;
      } else {
        parche.replied = true;
        parche.replied_at = sentAt;
        parche.status = "respondido";
      }
      await supabase.from("inbox_threads").update(parche).eq("id", threadId);

      // ── 4. IA: enriquece y redacta. Nunca bloquea lo anterior ─────────────
      if (entrante && conIa) {
        await enriquecerConIa({
          threadId,
          messageId: mensaje?.id ?? null,
          item,
        });
      }
    } catch (error) {
      resultado.errores.push(error instanceof Error ? error.message : String(error));
    }
  }

  return resultado;
}

/**
 * Análisis con IA de un mensaje ya guardado. Separado para poder llamarlo desde
 * `after()` en los webhooks (responder rápido a Meta) y desde el botón de
 * regenerar de la interfaz.
 */
export async function enriquecerConIa(input: {
  threadId: string;
  messageId: string | null;
  item: Pick<NormalizedItem, "body" | "kind" | "rating" | "platform" | "customerName">;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const { analisis, sugerencia } = await analizarMensaje({
    texto: input.item.body,
    kind: input.item.kind,
    rating: input.item.rating,
    plataforma: input.item.platform,
    autor: input.item.customerName,
  });

  await supabase
    .from("inbox_threads")
    .update({
      language: analisis.language,
      sentiment: analisis.sentiment,
      intents: analisis.intents,
      is_complaint: analisis.isComplaint,
      priority: analisis.priority,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.threadId);

  if (!sugerencia) return;

  // ── Política de respuesta automática ──────────────────────────────────────
  // Se evalúa SIEMPRE, esté activada o no. Con la función apagada la decisión
  // queda guardada como 'simulada' y sirve para ver, durante unas semanas, qué
  // habría publicado el sistema antes de dejarle publicar de verdad.
  const ajustes = await leerAjustesAutoReply();
  const decision = decidir(
    {
      platform: input.item.platform,
      kind: input.item.kind,
      rating: input.item.rating,
      isComplaint: analisis.isComplaint,
      sentiment: analisis.sentiment,
      priority: analisis.priority,
      intents: analisis.intents,
      borrador: sugerencia.reply,
    },
    ajustes,
  );

  // Se guarda antes de intentar nada. Así un fallo a mitad de camino nunca deja
  // una fila diciendo 'enviada' sin que se haya enviado.
  const fila = {
    thread_id: input.threadId,
    message_id: input.messageId,
    model: sugerencia.model,
    language: sugerencia.language,
    reply_text: sugerencia.reply,
    analysis: {
      sentiment: sugerencia.sentiment,
      intents: sugerencia.intents,
      isComplaint: sugerencia.isComplaint,
      priority: sugerencia.priority,
    } as never,
  };

  const guardado = await supabase
    .from("inbox_ai_suggestions")
    .insert({
      ...fila,
      auto_decision: decision.apta ? "simulada" : "revisar",
      auto_motivo: decision.motivo,
    })
    .select("id")
    .single();

  // Si la migración 039 no está aplicada todavía, esas dos columnas no existen.
  // Sin este respaldo el borrador NO se guardaría, que es peor que perder el
  // rastro de la decisión. En este proyecto ya ha pasado que una migración se
  // quede semanas sin aplicar (la 023 dejó los anuncios rotos).
  if (guardado.error?.code === "PGRST204" || guardado.error?.code === "42703") {
    console.warn(
      "[inbox] migración 039 sin aplicar: se guarda el borrador sin la decisión automática",
    );
    await supabase.from("inbox_ai_suggestions").insert(fila);
    return; // Sin sitio donde registrar la decisión, tampoco se publica solo.
  }

  if (guardado.error) {
    console.error("[inbox] no se pudo guardar el borrador:", guardado.error.message);
    return;
  }

  const guardada = guardado.data;

  if (!decision.apta || !ajustes.activa) return;

  const envio = await enviarRespuesta({
    threadId: input.threadId,
    texto: sugerencia.reply,
    autor: AUTOR_AUTOMATICO,
    autorEmail: null,
    sugerenciaId: guardada?.id ?? null,
  });

  if (!envio.ok) {
    // El cliente sigue esperando respuesta: pasa a la cola de personas en vez
    // de quedarse como simulacro, que se leería como "no hacía falta".
    console.error("[inbox] la respuesta automática no se pudo publicar:", envio.error);
    if (guardada?.id) {
      await supabase
        .from("inbox_ai_suggestions")
        .update({ auto_decision: "revisar", auto_motivo: "envio_fallido" })
        .eq("id", guardada.id);
    }
    return;
  }

  if (guardada?.id) {
    await supabase
      .from("inbox_ai_suggestions")
      .update({ auto_decision: "enviada", auto_enviada_at: envio.enviadoEn })
      .eq("id", guardada.id);
  }
}
