import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { HorarioDia } from "@/lib/reservas/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const tbl = (sb: ReturnType<typeof getSupabaseAdmin>) => (sb as any).from("horario_semanal");

export async function GET() {
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ error: "No configurado" }, { status: 503 });
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const { data, error } = await tbl(sb).select("*").order("dia");
  if (error) return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 });
  return NextResponse.json({ horario: data as HorarioDia[] });
}

export async function PUT(req: NextRequest) {
  const sb = getSupabaseAdmin();
  if (!sb) return NextResponse.json({ error: "No configurado" }, { status: 503 });
  const body = (await req.json()) as HorarioDia[];
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const { error } = await tbl(sb).upsert(body, { onConflict: "dia" });
  if (error) return NextResponse.json({ error: (error as { message: string }).message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
