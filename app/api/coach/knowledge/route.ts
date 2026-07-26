import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isCoachAdmin } from "@/lib/auth/guards";
import { isKnowledgeCategory, parseKnowledgeBody } from "@/lib/coach/knowledge";
import type { DbCoachKnowledgeEntry } from "@/lib/coach/types";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const MAX_ENTRIES = 200;

/** Lista completa de conocimiento (incluye inactivas) para gestión. */
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "not_authenticated", message: "Debes iniciar sesión." },
      { status: 401 },
    );
  }
  if (!isCoachAdmin(user)) {
    return NextResponse.json(
      { error: "forbidden", message: "Solo gestión puede editar el conocimiento." },
      { status: 403 },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ entries: [] });
  }

  const categoryParam = request.nextUrl.searchParams.get("category");
  const category = isKnowledgeCategory(categoryParam) ? categoryParam : null;

  let query = supabase
    .from("coach_knowledge_entries")
    .select("id, category, title, content, keywords, active, created_at, updated_at");
  if (category) query = query.eq("category", category);

  const { data, error } = await query
    .order("updated_at", { ascending: false })
    .limit(MAX_ENTRIES)
    .returns<DbCoachKnowledgeEntry[]>();

  if (error) {
    // Tabla aún sin migrar u otro fallo: lista vacía en lugar de romper la página.
    return NextResponse.json({ entries: [] });
  }

  return NextResponse.json(
    { entries: data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Crea una entrada de conocimiento. */
export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json(
      { error: "not_authenticated", message: "Debes iniciar sesión." },
      { status: 401 },
    );
  }
  if (!isCoachAdmin(user)) {
    return NextResponse.json(
      { error: "forbidden", message: "Solo gestión puede editar el conocimiento." },
      { status: 403 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Solicitud inválida." },
      { status: 400 },
    );
  }

  const parsed = parseKnowledgeBody(body);
  if (!parsed) {
    return NextResponse.json(
      {
        error: "invalid_entry",
        message: "Categoría, título y contenido son obligatorios.",
      },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "coach_not_configured", message: "Servicio no disponible." },
      { status: 503 },
    );
  }

  const { data, error } = await supabase
    .from("coach_knowledge_entries")
    .insert(parsed)
    .select("id, category, title, content, keywords, active, created_at, updated_at")
    .single<DbCoachKnowledgeEntry>();

  if (error || !data) {
    return NextResponse.json(
      { error: "knowledge_unavailable", message: "No se pudo guardar la entrada." },
      { status: 503 },
    );
  }

  return NextResponse.json({ entry: data }, { status: 201 });
}
