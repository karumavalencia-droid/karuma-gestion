import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { HorarioDia } from "@/lib/reservas/types";
import { isReservationStaffRequest } from "@/lib/reservas/security";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tbl = (sb: ReturnType<typeof getSupabaseAdmin>) => (sb as any).from("horario_semanal");

export async function GET(req: NextRequest) {
  if (!(await isReservationStaffRequest(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ error: "No configurado" }, { status: 503 });
  const { data, error } = await tbl(sb).select("*").order("dia");
  if (error) return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 });
  return NextResponse.json({ horario: data as HorarioDia[] });
}

export async function PUT(req: NextRequest) {
  if (!(await isReservationStaffRequest(req))) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ error: "No configurado" }, { status: 503 });
  const body = (await req.json()) as HorarioDia[];
  const { error } = await tbl(sb).upsert(body, { onConflict: "dia" });
  if (error) return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
