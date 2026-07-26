/**
 * POST /api/inbox/threads/[id]/ai — regenerar el borrador de IA
 *
 * Vuelve a analizar el último mensaje entrante del hilo. Se guarda como una
 * sugerencia nueva: no se pierde la anterior.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireInbox } from "@/lib/auth/inbox-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { enriquecerConIa } from "@/lib/inbox/ingest";
import type { InboxKind, InboxPlatform } from "@/lib/inbox/types";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireInbox(request);
  if ("response" in guard) return guard.response;

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "La IA no está configurada (falta OPENAI_API_KEY)" },
      { status: 503 },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  const { id } = await params;

  const { data: thread } = await supabase
    .from("inbox_threads")
    .select("id, platform, kind, rating, customer_name")
    .eq("id", id)
    .maybeSingle();

  if (!thread) return NextResponse.json({ error: "Hilo no encontrado" }, { status: 404 });

  const { data: ultimo } = await supabase
    .from("inbox_messages")
    .select("id, body")
    .eq("thread_id", id)
    .eq("direction", "in")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!ultimo?.body) {
    return NextResponse.json(
      { error: "El hilo no tiene ningún mensaje del cliente que analizar" },
      { status: 400 },
    );
  }

  await enriquecerConIa({
    threadId: id,
    messageId: ultimo.id,
    item: {
      body: ultimo.body,
      kind: thread.kind as InboxKind,
      rating: thread.rating,
      platform: thread.platform as InboxPlatform,
      customerName: thread.customer_name,
    },
  });

  const { data: sugerencia } = await supabase
    .from("inbox_ai_suggestions")
    .select("id, model, language, reply_text, analysis, created_at")
    .eq("thread_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!sugerencia) {
    return NextResponse.json(
      { error: "La IA no devolvió ningún borrador. Inténtalo de nuevo." },
      { status: 502 },
    );
  }

  return NextResponse.json({ sugerencia });
}
