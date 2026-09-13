import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Solo recetas publicadas; no expone borradores ni otros documentos de Coach. */
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ message: "Debes iniciar sesión." }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ message: "Las recetas no están disponibles." }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("coach_knowledge_entries")
    .select("id, title, content")
    .eq("category", "recipe")
    .eq("active", true)
    .order("title", { ascending: true })
    .limit(200);

  if (error) {
    return NextResponse.json({ message: "No se pudieron cargar las recetas." }, { status: 503 });
  }

  return NextResponse.json(
    { recipes: (data ?? []).filter((entry) => !entry.title.startsWith("[EJEMPLO]")) },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
