/**
 * GET   /api/inbox/threads/[id] — hilo + mensajes + último borrador de IA
 * PATCH /api/inbox/threads/[id] — status, priority, assigned_to, unread
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireInbox } from "@/lib/auth/inbox-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  DbInboxPriority,
  DbInboxStatus,
  DbInboxThread,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const ESTADOS = new Set(["nuevo", "en_curso", "respondido", "cerrado", "ignorado"]);
const PRIORIDADES = new Set(["baja", "normal", "alta", "urgente"]);

export async function GET(
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

  const { data: thread, error } = await supabase
    .from("inbox_threads")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!thread) return NextResponse.json({ error: "Hilo no encontrado" }, { status: 404 });

  const [{ data: mensajes }, { data: sugerencias }] = await Promise.all([
    supabase
      .from("inbox_messages")
      .select("id, direction, author_name, author_username, body, attachments, sent_at, received_at")
      .eq("thread_id", id)
      .order("sent_at", { ascending: true }),
    supabase
      .from("inbox_ai_suggestions")
      .select("id, model, language, reply_text, analysis, used, created_at")
      .eq("thread_id", id)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  // Abrir el hilo lo marca como leído.
  if (thread.unread) {
    await supabase.from("inbox_threads").update({ unread: false }).eq("id", id);
    thread.unread = false;
  }

  return NextResponse.json({
    thread,
    mensajes: mensajes ?? [],
    sugerencia: sugerencias?.[0] ?? null,
  });
}

export async function PATCH(
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
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;

  const parche: Partial<DbInboxThread> = { updated_at: new Date().toISOString() };

  if (typeof body.status === "string") {
    if (!ESTADOS.has(body.status)) {
      return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
    }
    parche.status = body.status as DbInboxStatus;
  }
  if (typeof body.priority === "string") {
    if (!PRIORIDADES.has(body.priority)) {
      return NextResponse.json({ error: "Prioridad no válida" }, { status: 400 });
    }
    parche.priority = body.priority as DbInboxPriority;
  }
  if (typeof body.unread === "boolean") parche.unread = body.unread;
  if (typeof body.assigned_to === "string" || body.assigned_to === null) {
    parche.assigned_to = body.assigned_to;
  }

  if (Object.keys(parche).length === 1) {
    return NextResponse.json({ error: "Nada que actualizar" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("inbox_threads")
    .update(parche)
    .eq("id", id)
    .select("id, status, priority, unread, assigned_to")
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Hilo no encontrado" }, { status: 404 });

  return NextResponse.json({ thread: data });
}
