import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isCeoAdmin } from "@/lib/auth/guards";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { DbOperationalAlert, AlertSeverity } from "@/lib/operations/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SEVERITIES = new Set<AlertSeverity>(["low", "medium", "high", "critical"]);

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!isCeoAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const status = request.nextUrl.searchParams.get("status") ?? "active";
  let query = supabase.from("operational_alerts").select("*").order("detected_at", { ascending: false }).limit(100);
  if (status === "active") query = query.in("status", ["open", "acknowledged"]);
  else if (status !== "all" && ["open", "acknowledged", "resolved", "dismissed"].includes(status)) {
    query = query.eq("status", status as "open" | "acknowledged" | "resolved" | "dismissed");
  }

  const { data, error } = await query.returns<DbOperationalAlert[]>();
  if (error) return NextResponse.json({ error: "alerts_load_failed" }, { status: 500 });

  return NextResponse.json({ alerts: data ?? [] }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!isCeoAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const body = await request.json().catch(() => null) as {
    title?: string;
    description?: string;
    severity?: AlertSeverity;
    suggestedAction?: string;
    dueAt?: string;
  } | null;

  if (!body?.title?.trim() || !body.description?.trim()) {
    return NextResponse.json({ error: "title_and_description_required" }, { status: 400 });
  }
  const severity = body.severity ?? "medium";
  if (!SEVERITIES.has(severity)) {
    return NextResponse.json({ error: "invalid_severity" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("operational_alerts")
    .insert({
      alert_type: "manual",
      severity,
      title: body.title.trim(),
      description: body.description.trim(),
      suggested_action: body.suggestedAction?.trim() || null,
      due_at: body.dueAt || null,
      source: "ceo",
      evidence: { created_by: user?.email },
    })
    .select("*")
    .single<DbOperationalAlert>();

  if (error) return NextResponse.json({ error: "alert_create_failed" }, { status: 500 });
  return NextResponse.json({ alert: data }, { status: 201 });
}
