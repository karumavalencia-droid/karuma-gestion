import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isReservationStaffRequest } from "@/lib/reservas/security";

export const dynamic = "force-dynamic";

// Historial de una reserva (solo personal). ?id=<reserva> o ?fecha=YYYY-MM-DD (todas las del día).
export async function GET(req: NextRequest) {
  if (!(await isReservationStaffRequest(req))) return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ eventos: [] });
  const id = req.nextUrl.searchParams.get("id");
  const fecha = req.nextUrl.searchParams.get("fecha");
  let ids: string[] = [];
  if (id) ids = [id];
  else if (fecha) {
    const { data } = await sb.from("reservas").select("id").eq("fecha", fecha);
    ids = (data ?? []).map((r: { id: string }) => r.id);
  }
  if (!ids.length) return NextResponse.json({ eventos: [] });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (sb as any).from("reservas_historial").select("*").in("reserva_id", ids).order("created_at", { ascending: true });
  if (error) return NextResponse.json({ eventos: [], aviso: error.message });
  return NextResponse.json({ eventos: data ?? [] });
}
