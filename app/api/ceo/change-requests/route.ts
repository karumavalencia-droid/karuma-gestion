import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isCeoAdmin } from "@/lib/auth/guards";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import {
  buildChangeCenterPlan,
  CHANGE_CENTER_STATUSES,
  type DbCeoChangeRequest,
  type DbCeoChangeRequestInsert,
} from "@/lib/ceo/change-center";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function canAccessChangeCenter(user: Awaited<ReturnType<typeof getSessionUser>>) {
  return isCeoAdmin(user);
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!canAccessChangeCenter(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const status = request.nextUrl.searchParams.get("status");
  const filteredStatus = CHANGE_CENTER_STATUSES.includes(status as never)
    ? (status as (typeof CHANGE_CENTER_STATUSES)[number])
    : null;
  let query = supabase
    .from("ceo_change_requests")
    .select("*")
    .order("created_at", { ascending: false });
  if (filteredStatus) {
    query = query.eq("status", filteredStatus);
  }

  const { data, error } = await query.returns<DbCeoChangeRequest[]>();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ requests: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!canAccessChangeCenter(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let body: { requestText?: string; title?: string } | null = null;
  try {
    body = (await request.json()) as { requestText?: string; title?: string };
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const requestText = typeof body?.requestText === "string" ? body.requestText.trim() : "";
  if (!requestText) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const plan = buildChangeCenterPlan(requestText);
  const payload: DbCeoChangeRequestInsert = {
    created_by_email: user!.email,
    created_by_name: user!.name,
    created_by_role: user!.role,
    title: typeof body?.title === "string" && body.title.trim() ? body.title.trim().slice(0, 96) : plan.title,
    request_text: requestText,
    summary: plan.summary,
    risk_level: plan.riskLevel,
    status: "draft",
    plan,
    github_branch: null,
    github_pr_url: null,
    vercel_preview_url: null,
    execution_notes: null,
  };

  const { data, error } = await supabase
    .from("ceo_change_requests")
    .insert(payload)
    .select("*")
    .single<DbCeoChangeRequest>();

  if (error || !data) {
    return NextResponse.json({ error: "request_create_failed" }, { status: 500 });
  }

  return NextResponse.json({ request: data }, { status: 201, headers: { "Cache-Control": "no-store" } });
}
