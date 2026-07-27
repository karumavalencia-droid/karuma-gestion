import { NextResponse } from "next/server";
import { getDefaultLocationId } from "@/lib/sales-sync/config";
import { upsertRestosuiteSession } from "@/lib/restosuite/session-store";

export const dynamic = "force-dynamic";

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

  await upsertRestosuiteSession({
    location_id: locationId,
    base_url: payload.baseUrl?.trim() || "https://bo.eu.restosuite.ai",
    vulcan_token: vulcanToken,
    corporation_id: corporationId,
    brand_id: brandId,
    shop_id: shopId,
    organization_id: organizationId,
    organization_type: organizationType,
    accept_timezone: payload.acceptTimezone?.trim() || "UTC+2",
    language_code: payload.languageCode?.trim() || "zh_CN",
    currency: payload.currency?.trim() || "EUR",
  });

  return NextResponse.json({ success: true, locationId });
}
