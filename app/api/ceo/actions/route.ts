import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { DbCeoAction } from "@/lib/supabase/types";
import type { DbCeoDraft } from "@/lib/supabase/types";
import type { DbCeoDraftInsert } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user || user.employeeId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const conversationId = request.nextUrl.searchParams.get("conversationId");
  let query = supabase.from("ceo_actions").select("*").order("created_at", { ascending: false });
  if (conversationId) {
    query = query.eq("conversation_id", conversationId);
  }
  const { data: actions } = await query.returns<DbCeoAction[]>();

  return NextResponse.json({ actions: actions ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user || user.employeeId) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let body: { actionId?: string; status?: "confirmed" | "cancelled"; createDraft?: boolean };
  try {
    body = (await request.json()) as { actionId?: string; status?: "confirmed" | "cancelled"; createDraft?: boolean };
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.actionId || !UUID_PATTERN.test(body.actionId)) {
    return NextResponse.json({ error: "invalid_action" }, { status: 400 });
  }
  if (body.status !== "confirmed" && body.status !== "cancelled") {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ceo_actions")
    .update({ status: body.status })
    .eq("id", body.actionId)
    .select("*")
    .single<DbCeoAction>();

  if (error || !data) {
    return NextResponse.json({ error: "action_update_failed" }, { status: 500 });
  }

  let draft: DbCeoDraft | null = null;
  if (body.createDraft && body.status === "confirmed") {
    const draftRows: DbCeoDraftInsert[] = [
      {
        conversation_id: data.conversation_id,
        draft_type: "ops_note",
        title: `Seguimiento: ${data.label.slice(0, 72)}`,
        content: `Acción confirmada: ${data.label}\n\nRevisión sugerida por AI CEO.`,
        status: "draft",
      },
    ];
    const { data: draftData } = await supabase
      .from("ceo_drafts")
      .insert(draftRows)
      .select("*")
      .single<DbCeoDraft>();
    draft = draftData ?? null;
  }

  return NextResponse.json({ action: data, draft }, { headers: { "Cache-Control": "no-store" } });
}
