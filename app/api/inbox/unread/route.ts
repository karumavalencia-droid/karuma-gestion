/**
 * GET /api/inbox/unread — contadores para la campana del header
 *
 * Devuelve el total sin responder y el desglose por plataforma:
 *   { total: 8, porPlataforma: { instagram: 5, google: 2, tripadvisor: 1 } }
 *
 * Consulta ligera: se pide cada 60 s como respaldo de Supabase Realtime.
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireInbox } from "@/lib/auth/inbox-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  enHorarioAhora,
  HORARIO_POR_DEFECTO,
  type Horario,
} from "@/lib/inbox/horario";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const guard = await requireInbox(request);
  if ("response" in guard) return guard.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    // Sin base de datos la campana simplemente no muestra nada.
    return NextResponse.json({ total: 0, porPlataforma: {}, urgentes: 0, enHorario: false });
  }

  const [{ data, error }, { data: ajustes }] = await Promise.all([
    supabase
      .from("inbox_threads")
      .select("platform, priority")
      .in("status", ["nuevo", "en_curso"]),
    supabase.from("inbox_settings").select("horario").eq("id", true).maybeSingle(),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const porPlataforma: Record<string, number> = {};
  let urgentes = 0;

  for (const fila of data ?? []) {
    porPlataforma[fila.platform] = (porPlataforma[fila.platform] ?? 0) + 1;
    if (fila.priority === "urgente" || fila.priority === "alta") urgentes += 1;
  }

  // El horario vive en hora local del restaurante; la conversión desde UTC la
  // hace enHorarioAhora. Sirve para no avisar de madrugada.
  const horario = (ajustes?.horario as Horario | undefined) ?? HORARIO_POR_DEFECTO;

  return NextResponse.json({
    total: data?.length ?? 0,
    porPlataforma,
    urgentes,
    enHorario: enHorarioAhora(horario),
  });
}
