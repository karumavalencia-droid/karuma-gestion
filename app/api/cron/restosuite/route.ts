import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logImport, upsertDailySales } from "@/lib/sales-sync/supabaseRepo";
import type { DailySalesRecord } from "@/lib/sales-sync/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const LOCATION_ID = "karuma-valencia";
const REPORT_PATH = "/api/report/data/queryData";

type Session = {
  base_url: string;
  vulcan_token: string;
  corporation_id: string;
  brand_id: string;
  shop_id: string;
  organization_id: string;
  organization_type: string;
  accept_timezone: string;
  language_code: string;
  currency: string;
};

type Cell = { value?: unknown; displayValue?: string };
type ReportRow = Record<string, Cell | unknown>;

function madridNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: Number(get("hour")),
    minute: Number(get("minute")),
  };
}

function value(row: ReportRow, key: string): unknown {
  const cell = row[key];
  if (cell && typeof cell === "object" && "value" in cell) return (cell as Cell).value;
  return cell;
}

function number(row: ReportRow, key: string): number {
  const raw = value(row, key);
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const parsed = Number(String(raw ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

async function fetchToday(session: Session, date: string): Promise<DailySalesRecord | null> {
  const response = await fetch(new URL(REPORT_PATH, session.base_url), {
    method: "POST",
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "vulcan-Token": session.vulcan_token,
      "Corporation-Id": session.corporation_id,
      "Brand-Id": session.brand_id,
      "Shop-Id": session.shop_id,
      "Organization-Id": session.organization_id,
      "Organization-Type": session.organization_type,
      "Accept-Timezone": session.accept_timezone || "Europe/Madrid",
      "Language-Code": session.language_code || "zh_CN",
    },
    body: JSON.stringify({
      metricsByDimQryV2: [],
      reportId: "888001",
      selectFields: [
        "D_businessDate",
        "M_Order_COUNT_Orders",
        "M_Order_SUM_guests",
        "M_Order_SUM_netSales",
        "M_Order_SUM_totalGrossSales",
        "M_Order_AVG_netSalesByGuest",
      ],
      aggFilters: [],
      proportionProperty: { enable: false },
      dimAdditionalStrategy: [],
      filters: [
        { fieldName: "D_businessDate", filterType: "RANGE", filterValue: [date, date] },
        { fieldName: "D_currency", filterType: "EQ", filterValue: [session.currency || "EUR"] },
        { fieldName: "D_shopId", filterType: "IN", filterValue: [session.shop_id] },
      ],
      page: { pageNo: 1, pageSize: 100 },
      orderBy: [{ D_businessDate: "ASC" }],
    }),
  });
  if (!response.ok) throw new Error(`RestoSuite HTTP ${response.status}`);
  const payload = (await response.json()) as {
    code?: string | number;
    msg?: string;
    data?: { rows?: ReportRow[] };
  };
  if (String(payload.code ?? "0") === "401" || String(payload.code ?? "0") === "403") {
    throw new Error("RestoSuite session expired");
  }
  const row = payload.data?.rows?.[0];
  if (!row) return null;
  const netSales = number(row, "M_Order_SUM_netSales");
  const customers = number(row, "M_Order_SUM_guests");
  const orders = number(row, "M_Order_COUNT_Orders");
  if (netSales <= 0 && customers <= 0 && orders <= 0) return null;
  const grossSales = number(row, "M_Order_SUM_totalGrossSales") || netSales;
  return {
    date,
    grossSales,
    netSales,
    customers,
    orders,
    averageTicket:
      number(row, "M_Order_AVG_netSalesByGuest") || (customers > 0 ? netSales / customers : 0),
    drinkSales: 0,
    deliverySales: 0,
    cashSales: 0,
    cardSales: 0,
    source: "restosuite-live-5m",
    locationId: LOCATION_ID,
    externalId: null,
    notes: "Sincronización automática cada 5 minutos",
    syncedAt: new Date().toISOString(),
  };
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = madridNow();
  if (now.hour < 13 || now.hour >= 24) {
    return NextResponse.json({ success: true, skipped: true, reason: "outside_sync_window", ...now });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  const { data: session, error } = await supabase
    .from("restosuite_sync_sessions")
    .select("base_url,vulcan_token,corporation_id,brand_id,shop_id,organization_id,organization_type,accept_timezone,language_code,currency")
    .eq("location_id", LOCATION_ID)
    .maybeSingle<Session>();
  if (error || !session) {
    return NextResponse.json({ error: "RestoSuite session not configured" }, { status: 503 });
  }

  try {
    const record = await fetchToday(session, now.date);
    if (!record) {
      return NextResponse.json({ success: true, noData: true, date: now.date });
    }
    const result = await upsertDailySales([record]);
    await logImport({
      source: record.source,
      fileName: null,
      totalRows: 1,
      insertedRows: result.inserted,
      updatedRows: result.updated,
      skippedRows: 0,
      status: "success",
      errorMessage: null,
    });
    return NextResponse.json({ success: true, date: now.date, ...result, netSales: record.netSales });
  } catch (error) {
    const message = error instanceof Error ? error.message : "RestoSuite sync failed";
    await logImport({
      source: "restosuite-live-5m",
      fileName: null,
      totalRows: 0,
      insertedRows: 0,
      updatedRows: 0,
      skippedRows: 0,
      status: "error",
      errorMessage: message,
    });
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
