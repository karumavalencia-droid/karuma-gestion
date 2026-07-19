import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isCeoAdmin } from "@/lib/auth/guards";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  ChangeCenterPlan,
  ChangeCenterStatus,
  DbCeoChangeRequest,
  DbCeoChangeRequestUpdate,
} from "@/lib/ceo/change-center";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_TRANSITIONS: Record<ChangeCenterStatus, ChangeCenterStatus[]> = {
  draft: ["planned"],
  planned: ["approved", "failed"],
  approved: ["executing", "failed"],
  executing: ["preview_ready", "failed"],
  preview_ready: ["completed", "failed"],
  completed: [],
  failed: ["planned"],
};

function canAccessChangeCenter(user: Awaited<ReturnType<typeof getSessionUser>>) {
  return isCeoAdmin(user);
}

function computeAuditFields(status: ChangeCenterStatus) {
  const now = new Date().toISOString();
  if (status === "approved") return { approved_at: now };
  if (status === "preview_ready") return { preview_ready_at: now };
  if (status === "completed") return { completed_at: now };
  if (status === "failed") return { failed_at: now };
  return {};
}

function appendLog(currentLog: unknown, entries: string[]) {
  const base = Array.isArray(currentLog) ? currentLog.filter((entry): entry is string => typeof entry === "string") : [];
  return [...base, ...entries];
}

export async function GET(
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

  const { data, error } = await supabase
    .from("ceo_change_requests")
    .select("*")
    .eq("id", id)
    .maybeSingle()
    .returns<DbCeoChangeRequest>();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json({ request: data }, { headers: { "Cache-Control": "no-store" } });
}

export async function PATCH(
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
    status?: ChangeCenterStatus;
    title?: string | null;
    summary?: string | null;
    request_text?: string | null;
    risk_level?: DbCeoChangeRequest["risk_level"];
    plan?: ChangeCenterPlan;
    github_branch?: string | null;
    github_pr_url?: string | null;
    vercel_preview_url?: string | null;
    execution_notes?: string | null;
    execution_log?: string[];
  };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const updates: DbCeoChangeRequestUpdate = {};
  let statusLogEntry: string | null = null;
  if (typeof body.title === "string") updates.title = body.title;
  if (typeof body.summary === "string") updates.summary = body.summary;
  if (typeof body.request_text === "string") updates.request_text = body.request_text;
  if (
    body.risk_level === "low" ||
    body.risk_level === "medium" ||
    body.risk_level === "high" ||
    body.risk_level === "critical"
  ) {
    updates.risk_level = body.risk_level;
  }
  if (body.plan) updates.plan = body.plan;
  if (body.status) {
    const { data: current } = await supabase
      .from("ceo_change_requests")
      .select("status")
      .eq("id", id)
      .maybeSingle();
    if (!current) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const currentStatus = current.status as ChangeCenterStatus;
    if (!ALLOWED_TRANSITIONS[currentStatus]?.includes(body.status)) {
      return NextResponse.json({ error: "invalid_transition" }, { status: 400 });
    }
    updates.status = body.status;
    Object.assign(updates, computeAuditFields(body.status));
    const now = new Date().toISOString();
    statusLogEntry = `[${now}] Status changed from ${currentStatus} to ${body.status}`;
  }
  if (typeof body.github_branch === "string" || body.github_branch === null) updates.github_branch = body.github_branch;
  if (typeof body.github_pr_url === "string" || body.github_pr_url === null) updates.github_pr_url = body.github_pr_url;
  if (typeof body.vercel_preview_url === "string" || body.vercel_preview_url === null) updates.vercel_preview_url = body.vercel_preview_url;
  if (typeof body.execution_notes === "string" || body.execution_notes === null) updates.execution_notes = body.execution_notes;
  if (Array.isArray(body.execution_log)) updates.execution_log = body.execution_log;

  if (statusLogEntry) {
    updates.execution_log = appendLog(updates.execution_log ?? (current as { execution_log?: unknown } | null)?.execution_log, [statusLogEntry]);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no_changes" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("ceo_change_requests")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single<DbCeoChangeRequest>();

  if (error || !data) {
    return NextResponse.json({ error: "request_update_failed" }, { status: 500 });
  }

  return NextResponse.json({ request: data }, { headers: { "Cache-Control": "no-store" } });
}
