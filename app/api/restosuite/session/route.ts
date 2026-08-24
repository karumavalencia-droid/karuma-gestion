import { NextResponse } from "next/server";
import { getDefaultLocationId, RESTOSUITE_REPORT_SOURCE, type RestosuiteReportConfig } from "@/lib/sales-sync/config";
import { fetchRestosuiteDailySales, RestosuiteAuthError } from "@/lib/restosuite/reportApi";
import { upsertRestosuiteSession } from "@/lib/restosuite/session-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { logImport, upsertDailySales } from "@/lib/sales-sync/supabaseRepo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type SessionPayload = {
  baseUrl?: string;
  locationId?: string;
  vulcanToken?: string;
  corporationId?: string;
  brandId?: string;
  shopId?: string;
  organizationId?: string;
  organizationType?: string;
  acceptTimezone?: string;
  languageCode?: string;
  currency?: string;
};

function madridBusinessDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function shiftDate(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

async function missingSalesRange(): Promise<{ startDate: string; endDate: string }> {
  const endDate = madridBusinessDate();
  const oldestAllowed = shiftDate(endDate, -92);
  const supabase = getSupabaseAdmin();
  if (!supabase) return { startDate: oldestAllowed, endDate };
  const { data } = await supabase
    .from("sales_daily")
    .select("business_date")
    .order("business_date", { ascending: false })
    .limit(1)
    .maybeSingle<{ business_date: string }>();
  const firstMissing = data?.business_date ? shiftDate(data.business_date, 1) : oldestAllowed;
  return {
    startDate: firstMissing > endDate ? shiftDate(endDate, -1) : firstMissing < oldestAllowed ? oldestAllowed : firstMissing,
    endDate,
  };
}

export async function GET() {
  const configured = Boolean(process.env.RESTOSUITE_VULCAN_TOKEN);
  return NextResponse.json({
    configured,
    locationId: process.env.RESTOSUITE_LOCATION_ID?.trim() || getDefaultLocationId(),
  });
}

export async function POST(request: Request) {
  const syncSecret = process.env.KARUMA_SYNC_SECRET?.trim();
  if (!syncSecret || request.headers.get("x-karuma-sync-key") !== syncSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: SessionPayload;
  try {
    payload = (await request.json()) as SessionPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const locationId = payload.locationId?.trim() || getDefaultLocationId();
  const vulcanToken = payload.vulcanToken?.trim();
  const corporationId = payload.corporationId?.trim();
  const brandId = payload.brandId?.trim();
  const shopId = payload.shopId?.trim();
  const organizationId = payload.organizationId?.trim();
  const organizationType = payload.organizationType?.trim();

  if (!vulcanToken || !corporationId || !brandId || !shopId || !organizationId || !organizationType) {
    return NextResponse.json(
      {
        error:
          "Missing required fields: vulcanToken, corporationId, brandId, shopId, organizationId, organizationType",
      },
      { status: 400 },
    );
  }

  const config: RestosuiteReportConfig = {
    baseUrl: payload.baseUrl?.trim() || "https://bo.eu.restosuite.ai",
    token: vulcanToken,
    corporationId,
    brandId,
    shopId,
    organizationId,
    organizationType,
    acceptTimezone: payload.acceptTimezone?.trim() || "UTC+2",
    languageCode: payload.languageCode?.trim() || "zh_CN",
    currency: payload.currency?.trim() || "EUR",
  };

  try {
    // Validate the new session before replacing the previous one. A successful
    // reconnect also fills the entire missing range (up to 93 days), instead
    // of waiting for the hourly cron to import only today and yesterday.
    const range = await missingSalesRange();
    const records = await fetchRestosuiteDailySales({ ...range, locationId, config });

    await upsertRestosuiteSession({
      location_id: locationId,
      base_url: config.baseUrl,
      vulcan_token: config.token,
      corporation_id: config.corporationId,
      brand_id: config.brandId,
      shop_id: config.shopId,
      organization_id: config.organizationId,
      organization_type: config.organizationType,
      accept_timezone: config.acceptTimezone,
      language_code: config.languageCode,
      currency: config.currency,
    });
    const result = await upsertDailySales(records);
    await logImport({
      source: RESTOSUITE_REPORT_SOURCE,
      fileName: `restosuite-reconnect-${range.startDate}_to_${range.endDate}.json`,
      totalRows: records.length,
      insertedRows: result.inserted,
      updatedRows: result.updated,
      skippedRows: 0,
      status: "success",
    });

    return NextResponse.json({ success: true, locationId, range, total: records.length, ...result });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        reauthRequired: error instanceof RestosuiteAuthError,
        error: error instanceof Error ? error.message : "No se pudo validar la sesión de RestoSuite",
      },
      { status: 502 },
    );
  }
}
