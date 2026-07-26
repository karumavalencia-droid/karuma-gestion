/**
 * GET /api/inbox/insights?dias=30 — analítica del Inbox (owner y encargado)
 *
 * Trae los hilos y mensajes del rango y agrega en `lib/inbox/insights.ts`, que
 * son funciones puras y probadas. Si el rango supera el tope de mensajes, se
 * dice en la respuesta (`truncado`) en vez de recortar en silencio.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireInbox } from "@/lib/auth/inbox-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  contar,
  contarMenciones,
  metricasRespuesta,
  porDia,
  repartoSentimiento,
  PAIS_ESTIMADO,
  type FilaHilo,
  type FilaMensaje,
} from "@/lib/inbox/insights";

export const dynamic = "force-dynamic";

const DIAS_POR_DEFECTO = 30;
const DIAS_MAXIMO = 180;
const TOPE_MENSAJES = 5000;

export async function GET(request: NextRequest) {
  const guard = await requireInbox(request);
  if ("response" in guard) return guard.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  const pedidos = Number(request.nextUrl.searchParams.get("dias")) || DIAS_POR_DEFECTO;
  const dias = Math.min(Math.max(pedidos, 1), DIAS_MAXIMO);

  const hasta = new Date();
  const desde = new Date(hasta.getTime() - dias * 24 * 60 * 60 * 1000);
  const desdeIso = desde.toISOString();

  const [hilosRes, mensajesRes, sugerenciasRes] = await Promise.all([
    supabase
      .from("inbox_threads")
      .select(
        "platform, language, intents, is_complaint, rating, sentiment, first_inbound_at, replied_at, replied, status",
      )
      .gte("created_at", desdeIso),
    supabase
      .from("inbox_messages")
      .select("direction, body, sent_at, received_at")
      .gte("received_at", desdeIso)
      .order("received_at", { ascending: false })
      .limit(TOPE_MENSAJES),
    supabase.from("inbox_ai_suggestions").select("used").gte("created_at", desdeIso),
  ]);

  if (hilosRes.error) {
    return NextResponse.json({ error: hilosRes.error.message }, { status: 500 });
  }

  const hilos = (hilosRes.data ?? []) as FilaHilo[];
  const mensajes = (mensajesRes.data ?? []) as FilaMensaje[];
  const sugerencias = sugerenciasRes.data ?? [];

  // Catálogos con los que cruzar las menciones. Si están vacíos, el panel lo
  // dice en vez de mostrar una lista falsamente vacía.
  const [productosRes, staffRes] = await Promise.all([
    supabase.from("inventory_items").select("name").eq("active", true).limit(500),
    supabase.from("staff").select("name").limit(200),
  ]);

  const textosEntrantes = mensajes
    .filter((m) => m.direction === "in")
    .map((m) => m.body ?? "");

  const usadas = sugerencias.filter((s) => s.used).length;

  return NextResponse.json({
    rango: { desde: desdeIso, hasta: hasta.toISOString(), dias },
    truncado: mensajes.length >= TOPE_MENSAJES,

    totales: {
      hilos: hilos.length,
      mensajesEntrantes: textosEntrantes.length,
      respondidos: hilos.filter((h) => h.replied).length,
      sinResponder: hilos.filter((h) => h.status === "nuevo" || h.status === "en_curso").length,
      quejas: hilos.filter((h) => h.is_complaint).length,
    },

    porDia: porDia(mensajes, desde, hasta),
    porPlataforma: contar(hilos.map((h) => h.platform)),
    intenciones: contar(hilos.flatMap((h) => h.intents ?? [])),

    idiomas: contar(hilos.map((h) => h.language)).map((c) => ({
      ...c,
      paisEstimado: PAIS_ESTIMADO[c.clave] ?? "Sin estimar",
    })),

    respuesta: metricasRespuesta(hilos),
    sentimiento: repartoSentimiento(hilos),

    ia: {
      sugerencias: sugerencias.length,
      usadas,
      porcentaje:
        sugerencias.length > 0 ? Math.round((usadas / sugerencias.length) * 100) : null,
    },

    productos: {
      catalogo: productosRes.data?.length ?? 0,
      menciones: contarMenciones(
        textosEntrantes,
        (productosRes.data ?? []).map((p) => p.name),
      ),
    },
    empleados: {
      catalogo: staffRes.data?.length ?? 0,
      menciones: contarMenciones(
        textosEntrantes,
        (staffRes.data ?? []).map((s) => s.name),
      ),
    },
  });
}
