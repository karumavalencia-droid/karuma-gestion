/**
 * GET /api/inbox/threads — bandeja (owner y encargado)
 *
 * Filtros: status, platform, priority, unread, q, cursor, limit.
 * Paginación por cursor sobre last_message_at (descendente).
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireInbox } from "@/lib/auth/inbox-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  DbInboxPlatform,
  DbInboxPriority,
  DbInboxStatus,
} from "@/lib/supabase/types";
import { INBOX_PLATFORMS } from "@/lib/inbox/types";

export const dynamic = "force-dynamic";

const LIMITE_POR_DEFECTO = 30;
const LIMITE_MAXIMO = 100;

const ESTADOS = new Set<string>([
  "nuevo",
  "en_curso",
  "respondido",
  "cerrado",
  "ignorado",
]);
const PRIORIDADES = new Set<string>(["baja", "normal", "alta", "urgente"]);
const PLATAFORMAS = new Set<string>(INBOX_PLATFORMS);

export async function GET(request: NextRequest) {
  const guard = await requireInbox(request);
  if ("response" in guard) return guard.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  const params = request.nextUrl.searchParams;
  const limit = Math.min(
    Number(params.get("limit")) || LIMITE_POR_DEFECTO,
    LIMITE_MAXIMO,
  );

  // El select va en una sola cadena literal: supabase-js infiere el tipo de la
  // fila leyéndola, y una concatenación lo deja en GenericStringError.
  let query = supabase
    .from("inbox_threads")
    .select(
      "id, platform, kind, customer_name, customer_username, customer_avatar_url, language, rating, sentiment, intents, is_complaint, status, priority, unread, first_inbound_at, last_inbound_at, last_message_at, replied, replied_at, permalink",
    )
    .order("last_message_at", { ascending: false })
    .limit(limit);

  const status = params.get("status");
  if (status === "pendientes") {
    query = query.in("status", ["nuevo", "en_curso"]);
  } else if (status && ESTADOS.has(status)) {
    query = query.eq("status", status as DbInboxStatus);
  }

  const platform = params.get("platform");
  if (platform && PLATAFORMAS.has(platform)) {
    query = query.eq("platform", platform as DbInboxPlatform);
  }

  const priority = params.get("priority");
  if (priority === "altas") {
    query = query.in("priority", ["alta", "urgente"]);
  } else if (priority && PRIORIDADES.has(priority)) {
    query = query.eq("priority", priority as DbInboxPriority);
  }

  if (params.get("unread") === "1") query = query.eq("unread", true);

  const q = params.get("q")?.trim();
  if (q) {
    // Escapa las comas: rompen la sintaxis del filtro `or` de PostgREST.
    const seguro = q.replace(/[,()]/g, " ");
    query = query.or(`customer_name.ilike.%${seguro}%,customer_username.ilike.%${seguro}%`);
  }

  const cursor = params.get("cursor");
  if (cursor) query = query.lt("last_message_at", cursor);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const threads = data ?? [];
  const siguiente =
    threads.length === limit ? threads[threads.length - 1]?.last_message_at ?? null : null;

  return NextResponse.json({ threads, cursor: siguiente });
}
