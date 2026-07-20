import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, isCeoAdmin } from "@/lib/auth/guards";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { AlertStatus, DbOperationalAlert } from "@/lib/operations/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUSES = new Set<AlertStatus>(["open", "acknowledged", "resolved", "dismissed"]);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(request);
  if (!isCeoAdmin(user)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { id } = await context.params;
  if (!UUID_PATTERN.test(id)) return NextResponse.json({ error: "invalid_alert" }, { status: 400 });

  const body = await request.json().catch(() => null) as {
    status?: AlertStatus;
    ownerEmail?: string | null;
    resolutionNote?: string | null;
  } | null;
  if (!body?.status || !STATUSES.has(body.status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "not_configured" }, { status: 503 });

  const now = new Date().toISOString();
  const update = {
    status: body.status,
    owner_email: body.ownerEmail?.trim() || user?.email || null,
    resolution_note: body.resolutionNote?.trim() || null,
    acknowledged_at: body.status === "acknowledged" ? now : undefined,
    resolved_at: body.status === "resolved" || body.status === "dismissed" ? now : undefined,
  };

  const { data, error } = await supabase
    .from("operational_alerts")
    .update(update)
    .eq("id", id)
    .select("*")
    .single<DbOperationalAlert>();

  if (error) return NextResponse.json({ error: "alert_update_failed" }, { status: 500 });

  await supabase.from("business_events").insert({
    entity_type: "operational_alert",
    entity_id: id,
    event_type: `alert.${body.status}`,
    actor_email: user?.email ?? null,
    source: "ceo_operations",
    next_state: { status: body.status, resolution_note: update.resolution_note },
  });

  return NextResponse.json({ alert: data });
}

