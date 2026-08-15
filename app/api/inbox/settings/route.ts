/**
 * GET/PATCH /api/inbox/settings — ajustes de la respuesta automática
 *
 * Leer: propietario y encargado. Escribir: SOLO el propietario. Activar la
 * publicación automática es decidir que algo se publique en nombre del
 * restaurante sin que nadie lo lea antes; no es un ajuste de encargado.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireInbox } from "@/lib/auth/inbox-guard";
import { plataformasDisponibles } from "@/lib/inbox/adapters";
import { leerAjustesAutoReply } from "@/lib/inbox/ajustes";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { InboxPlatform } from "@/lib/inbox/types";
import type { DbInboxSettings } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

/** Una decisión ya tomada, para la pantalla de simulacro. */
export type DecisionReciente = {
  id: string;
  reply_text: string;
  auto_decision: "enviada" | "simulada" | "revisar" | null;
  auto_motivo: string | null;
  auto_enviada_at: string | null;
  created_at: string;
  hilo: { id: string; platform: string; rating: number | null; customer_name: string | null } | null;
  mensaje: { body: string } | null;
};

export async function GET(request: NextRequest) {
  const guard = await requireInbox(request);
  if ("response" in guard) return guard.response;

  const ajustes = await leerAjustesAutoReply();
  const supabase = getSupabaseAdmin();

  // Lo que de verdad hace falta antes de activar nada: ver qué habría publicado
  // el sistema. Sin esta lista, encender la función es un acto de fe.
  let recientes: DecisionReciente[] = [];
  if (supabase) {
    const { data } = await supabase
      .from("inbox_ai_suggestions")
      .select(
        "id, reply_text, auto_decision, auto_motivo, auto_enviada_at, created_at," +
          "hilo:inbox_threads(id, platform, rating, customer_name)," +
          "mensaje:inbox_messages(body)",
      )
      .not("auto_decision", "is", null)
      .order("created_at", { ascending: false })
      .limit(20)
      .returns<DecisionReciente[]>();
    recientes = data ?? [];
  }

  return NextResponse.json({
    ...ajustes,
    // Solo tiene sentido ofrecer plataformas que sepan responder. Hoy es
    // `manual`: el adaptador de Google llega cuando Google apruebe el acceso.
    disponibles: plataformasDisponibles(),
    puedeEditar: guard.user.role === "owner",
    recientes,
  });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireInbox(request);
  if ("response" in guard) return guard.response;

  if (guard.user.role !== "owner") {
    return NextResponse.json(
      { error: "Solo el propietario puede cambiar la respuesta automática" },
      { status: 403 },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    activa?: unknown;
    minEstrellas?: unknown;
    plataformas?: unknown;
  };

  const parche: Partial<DbInboxSettings> = { updated_at: new Date().toISOString() };

  if (body.activa !== undefined) {
    if (typeof body.activa !== "boolean") {
      return NextResponse.json({ error: "`activa` debe ser true o false" }, { status: 400 });
    }
    parche.auto_reply_activa = body.activa;
  }

  if (body.minEstrellas !== undefined) {
    const n = Number(body.minEstrellas);
    if (!Number.isInteger(n) || n < 1 || n > 5) {
      return NextResponse.json(
        { error: "`minEstrellas` debe ser un entero entre 1 y 5" },
        { status: 400 },
      );
    }
    parche.auto_reply_min_estrellas = n;
  }

  if (body.plataformas !== undefined) {
    if (!Array.isArray(body.plataformas)) {
      return NextResponse.json({ error: "`plataformas` debe ser una lista" }, { status: 400 });
    }
    const disponibles = plataformasDisponibles();
    const pedidas = body.plataformas as InboxPlatform[];
    const invalida = pedidas.find((p) => !disponibles.includes(p));
    if (invalida) {
      // Sin adaptador no hay forma de publicar: permitirlo dejaría la función
      // activada sobre algo que fallaría en cada intento.
      return NextResponse.json(
        { error: `Todavía no hay integración con ${invalida}` },
        { status: 400 },
      );
    }
    parche.auto_reply_plataformas = pedidas;
  }

  const { error } = await supabase.from("inbox_settings").update(parche).eq("id", true);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(await leerAjustesAutoReply());
}
