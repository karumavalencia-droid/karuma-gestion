import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/admin";
import { normalizeSalesPayload } from "@/lib/sales-sync/normalize";
import { mergeDailySalesRecords, readDailySalesStore } from "@/lib/sales-sync/storage";

export const dynamic = "force-dynamic";

function todayInMadrid(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ configured: false, updatedAt: null, records: [] });
  }

  try {
    const url = new URL(request.url);
    const limit = Math.min(366, Math.max(1, Number(url.searchParams.get("limit")) || 62));
    const store = await readDailySalesStore();
    return NextResponse.json({
      configured: true,
      updatedAt: store.updatedAt,
      records: store.records.slice(-limit),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to read daily sales" },
      { status: 500 },
    );
  }
}
export async function POST(request: Request) {
  const secret = process.env.KARUMA_SYNC_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "KARUMA_SYNC_SECRET is not configured" }, { status: 503 });
  }
  if (request.headers.get("x-karuma-sync-key") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await request.json();
    const records = normalizeSalesPayload(payload, {
      fallbackDate: todayInMadrid(),
      source: request.headers.get("x-karuma-source") || "pos-webhook",
      locationId: request.headers.get("x-karuma-location") || "karuma-valencia",
    });
    if (records.length === 0) {
      return NextResponse.json({ error: "No valid sales records found" }, { status: 422 });
    }

    const result = await mergeDailySalesRecords(records);
    return NextResponse.json({
      success: true,
      inserted: result.inserted,
      updated: result.updated,
      total: result.store.records.length,
      updatedAt: result.store.updatedAt,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to save daily sales" },
      { status: 500 },
    );
  }
}
