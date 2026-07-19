import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isCeoAdmin } from "@/lib/auth/guards";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { DbCeoChangeRequest } from "@/lib/ceo/change-center";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function canAccessChangeCenter(user: Awaited<ReturnType<typeof getSessionUser>>) {
  return isCeoAdmin(user);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser(request);
  if (!canAccessChangeCenter(user)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id } = await params;
  if (!UUID_PATTERN.test(id)) {
    return NextResponse.json({ error: "invalid_id" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  let body: {
    github_branch?: string | null;
    github_pr_url?: string | null;
    vercel_preview_url?: string | null;
    execution_notes?: string | null;
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const { data: current } = await supabase
    .from("ceo_change_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle()
    .returns<DbCeoChangeRequest>();

  if (!current) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("ceo_change_requests")
    .update({
      status: "executing",
      github_branch: body.github_branch ?? current.github_branch ?? `change/${id.slice(0, 8)}`,
      github_pr_url: body.github_pr_url ?? current.github_pr_url,
      vercel_preview_url: body.vercel_preview_url ?? current.vercel_preview_url,
      execution_notes:
        body.execution_notes ??
        current.execution_notes ??
        `Executor reserved at ${now}. Manual automation will connect later.`,
    })
    .eq("id", id)
    .select("*")
    .single<DbCeoChangeRequest>();

  if (error || !data) {
    return NextResponse.json({ error: "request_execute_failed" }, { status: 500 });
  }

  return NextResponse.json(
    { request: data, executor: { started_at: now, mode: "placeholder" } },
    { headers: { "Cache-Control": "no-store" } },
  );
}
