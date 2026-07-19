import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { DbCeoDraft, DbCeoDraftInsert } from "@/lib/supabase/types";

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
  if (conversationId && !UUID_PATTERN.test(conversationId)) {
    return NextResponse.json({ error: "invalid_conversation" }, { status: 400 });
  }

  let query = supabase.from("ceo_drafts").select("*").order("created_at", { ascending: false });
  if (conversationId) query = query.eq("conversation_id", conversationId);
  const { data } = await query.returns<DbCeoDraft[]>();

  return NextResponse.json({ drafts: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
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

  let body: DbCeoDraftInsert & { id?: string };
  try {
    body = (await request.json()) as DbCeoDraftInsert & { id?: string };
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if (!body.conversation_id || !UUID_PATTERN.test(body.conversation_id)) {
    return NextResponse.json({ error: "invalid_conversation" }, { status: 400 });
  }
  if (!body.title || !body.content || !body.draft_type) {
    return NextResponse.json({ error: "invalid_draft" }, { status: 400 });
  }

  const payload = {
    conversation_id: body.conversation_id,
    draft_type: body.draft_type,
    title: body.title,
    content: body.content,
    status: body.status ?? "draft",
  };

  const query = body.id && UUID_PATTERN.test(body.id)
    ? supabase.from("ceo_drafts").update(payload).eq("id", body.id)
    : supabase.from("ceo_drafts").insert(payload);

  const { data, error } = await query.select("*").single<DbCeoDraft>();

  if (error || !data) {
    return NextResponse.json({ error: "draft_create_failed" }, { status: 500 });
  }

  return NextResponse.json({ draft: data }, { headers: { "Cache-Control": "no-store" } });
}
