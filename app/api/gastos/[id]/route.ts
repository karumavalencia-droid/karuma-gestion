/** DELETE /api/gastos/:id — eliminar un gasto (solo owner). */

import { NextRequest, NextResponse } from "next/server";
import { requireOwner } from "@/lib/auth/owner-guard";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireOwner(request);
  if ("response" in guard) return guard.response;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  const { id } = await params;
  const { error } = await supabase.from("gastos").delete().eq("id", id);

  if (error) {
    console.error("[gastos] Error eliminando:", error);
    return NextResponse.json({ error: "Error eliminando el gasto" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
