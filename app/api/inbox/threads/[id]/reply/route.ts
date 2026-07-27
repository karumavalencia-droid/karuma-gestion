/**
 * POST /api/inbox/threads/[id]/reply — responder al cliente
 *
 * Envía por el adaptador de la plataforma y guarda el mensaje saliente.
 * Si la plataforma no permite responder por API (Tripadvisor), devuelve 409 con
 * el permalink para que la interfaz ofrezca "copiar y abrir".
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireInbox } from "@/lib/auth/inbox-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { getAdapter } from "@/lib/inbox/adapters";
import type { InboxPlatform } from "@/lib/inbox/types";

export const dynamic = "force-dynamic";

const LARGO_MAXIMO = 4000;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireInbox(request);
  if ("response" in guard) return guard.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    texto?: string;
    sugerenciaId?: string;
  };

  const texto = body.texto?.trim();
  if (!texto) {
    return NextResponse.json({ error: "La respuesta está vacía" }, { status: 400 });
  }
  if (texto.length > LARGO_MAXIMO) {
    return NextResponse.json({ error: "La respuesta es demasiado larga" }, { status: 400 });
  }

  const { data: thread } = await supabase
    .from("inbox_threads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!thread) return NextResponse.json({ error: "Hilo no encontrado" }, { status: 404 });

  const adapter = getAdapter(thread.platform as InboxPlatform);
  if (!adapter) {
    return NextResponse.json(
      { error: `Todavía no hay integración con ${thread.platform}` },
      { status: 501 },
    );
  }

  if (!adapter.canReply || !adapter.reply) {
    return NextResponse.json(
      {
        error: `${adapter.label} no permite responder desde aquí`,
        permalink: thread.permalink,
      },
      { status: 409 },
    );
  }

  let externalId: string | undefined;
  try {
    const envio = await adapter.reply(thread as never, texto);
    externalId = envio.externalId;
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo enviar la respuesta" },
      { status: 502 },
    );
  }

  const ahora = new Date().toISOString();

  const { error: errorMensaje } = await supabase.from("inbox_messages").insert({
    thread_id: id,
    platform: thread.platform,
    direction: "out",
    external_id: externalId ?? null,
    author_name: guard.user.name,
    body: texto,
    sent_at: ahora,
  });

  if (errorMensaje) {
    return NextResponse.json({ error: errorMensaje.message }, { status: 500 });
  }

  await supabase
    .from("inbox_threads")
    .update({
      replied: true,
      replied_at: ahora,
      replied_by: guard.user.email,
      status: "respondido",
      unread: false,
      last_message_at: ahora,
      updated_at: ahora,
    })
    .eq("id", id);

  // Marcar el borrador como usado alimenta la métrica de uso de IA.
  if (body.sugerenciaId) {
    await supabase
      .from("inbox_ai_suggestions")
      .update({ used: true })
      .eq("id", body.sugerenciaId)
      .eq("thread_id", id);
  }

  return NextResponse.json({ ok: true, enviadoEn: ahora });
}
