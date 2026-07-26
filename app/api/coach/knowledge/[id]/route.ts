import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isCoachAdmin } from "@/lib/auth/guards";
import { parseKnowledgeBody } from "@/lib/coach/knowledge";
import type { DbCoachKnowledgeEntry } from "@/lib/coach/types";
import type { SessionUser } from "@/lib/auth/session";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function authorize(
  request: NextRequest,
): Promise<{ user: SessionUser } | { response: NextResponse }> {
  const user = await getSessionUser(request);
  if (!user) {
    return {
      response: NextResponse.json(
        { error: "not_authenticated", message: "Debes iniciar sesión." },
        { status: 401 },
      ),
    };
  }
  if (!isCoachAdmin(user)) {
    return {
      response: NextResponse.json(
        { error: "forbidden", message: "Solo gestión puede editar el conocimiento." },
        { status: 403 },
      ),
    };
  }
  return { user };
}

/** Actualiza una entrada completa (categoría, título, contenido, keywords, activo). */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: "invalid_entry", message: "Entrada inválida." },
      { status: 400 },
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
    .update({ ...parsed, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("id, category, title, content, keywords, active, created_at, updated_at")
    .maybeSingle<DbCoachKnowledgeEntry>();

  if (error || !data) {
    return NextResponse.json(
      { error: "entry_not_found", message: "Entrada no encontrada." },
      { status: 404 },
    );
  }

  return NextResponse.json({ entry: data });
}

/** Elimina una entrada definitivamente. Para ocultarla sin borrar, usar active=false. */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authorize(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json(
      { error: "invalid_entry", message: "Entrada inválida." },
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
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle<Pick<DbCoachKnowledgeEntry, "id">>();

  if (error || !data) {
    return NextResponse.json(
      { error: "entry_not_found", message: "Entrada no encontrada." },
      { status: 404 },
    );
  }

  return NextResponse.json({ deleted: data.id });
}
