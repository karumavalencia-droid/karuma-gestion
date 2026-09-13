import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/** Full published recipes for signed-in staff; editing stays in Coach management. */
export async function GET(request: NextRequest) {
  if (!(await getSessionUser(request))) {
    return NextResponse.json({ error: "not_authenticated" }, { status: 401 });
  }
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "recipes_unavailable" }, { status: 503 });
  const { data, error } = await supabase
    .from("coach_knowledge_entries")
    .select("id, title, content, keywords")
    .eq("category", "recipe")
    .eq("active", true)
    .order("title")
    .limit(200);
  if (error) return NextResponse.json({ error: "recipes_unavailable" }, { status: 503 });
  return NextResponse.json({ recipes: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}
