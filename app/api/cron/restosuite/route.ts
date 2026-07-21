// NOTA (MVP ventas): esta ruta de cron está EN ESPERA de una API/exportación
// oficial de Restosuite. Restosuite no expone hoy una API pública estable
// (ver análisis previo); la vía soportada de entrada de datos es la importación
// manual de CSV (POST /api/sales/import). Mientras RESTOSUITE_API_URL sea un
// placeholder o falte, esta ruta responde "no configurada" y NO hace ninguna
// petición externa (nunca llama a pos-provider.example).
import { NextResponse } from "next/server";
import { parseRestosuiteCsv } from "@/lib/restosuite/csvImport";
import { isPlaceholderApiUrl } from "@/lib/sales-sync/config";
import { normalizeSalesPayload } from "@/lib/sales-sync/normalize";
import { mergeDailySalesRecords } from "@/lib/sales-sync/storage";
import type { DailySalesRecord } from "@/lib/sales-sync/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function dateInMadrid(daysFromToday: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + daysFromToday);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function buildRestosuiteUrl(baseUrl: string, date: string, locationId: string): string {
  const expanded = baseUrl
    .replaceAll("{date}", encodeURIComponent(date))
    .replaceAll("{locationId}", encodeURIComponent(locationId));
  const url = new URL(expanded);
  if (!baseUrl.includes("{date}")) {
    url.searchParams.set(process.env.RESTOSUITE_DATE_PARAM || "date", date);
  }
  if (locationId && !baseUrl.includes("{locationId}")) {
    url.searchParams.set(process.env.RESTOSUITE_LOCATION_PARAM || "locationId", locationId);
  }
  return url.toString();
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiUrl = process.env.RESTOSUITE_API_URL;
  const apiToken = process.env.RESTOSUITE_API_TOKEN;
  const locationId = process.env.RESTOSUITE_LOCATION_ID || "karuma-valencia";
  // No hacer ninguna petición externa mientras la API sea un placeholder.
  if (!apiUrl || !apiToken || isPlaceholderApiUrl(apiUrl)) {
    return NextResponse.json(
      {
        success: false,
        configured: false,
        pendingOfficialApi: true,
        message:
          "Restosuite no tiene API oficial configurada. Usa la importación manual de CSV (/api/sales/import).",
      },
      { status: 503 },
    );
  }

  const requestUrl = new URL(request.url);
  const targetDate = requestUrl.searchParams.get("date") || dateInMadrid(-1);
  const authHeader = process.env.RESTOSUITE_API_KEY_HEADER || "Authorization";
  const authPrefix = process.env.RESTOSUITE_API_KEY_PREFIX ?? "Bearer ";
  const headers = new Headers({ Accept: "application/json, text/csv" });
  headers.set(authHeader, `${authPrefix}${apiToken}`);

  try {
    const response = await fetch(buildRestosuiteUrl(apiUrl, targetDate, locationId), {
      headers,
      cache: "no-store",
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: `Restosuite responded with ${response.status}` },
        { status: 502 },
      );
    }

    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("json") ? await response.json() : await response.text();
    const records =
      typeof payload === "string"
        ? (() => {
            const parsed = parseRestosuiteCsv(payload, `restosuite-${targetDate}.csv`);
            const syncedAt = new Date().toISOString();
            return (parsed.preview?.registros ?? []).map(
              (record): DailySalesRecord => ({
                date: record.fecha,
                grossSales: record.ventas,
                netSales: record.ventas,
                customers: record.clientes,
                orders: record.facturas,
                averageTicket: record.ticketMedio,
                drinkSales: record.ventasBebida,
                deliverySales: 0,
                cashSales: 0,
                cardSales: 0,
                source: "restosuite-csv",
                locationId,
                externalId: null,
                notes: record.observaciones,
                syncedAt,
              }),
            );
          })()
        : normalizeSalesPayload(payload, {
            fallbackDate: targetDate,
            source: "restosuite-api",
            locationId,
          });

    if (records.length === 0) {
      return NextResponse.json(
        { error: "No valid sales records found" },
        { status: 422 },
      );
    }

    const result = await mergeDailySalesRecords(records);
    return NextResponse.json({
      success: true,
      date: targetDate,
      inserted: result.inserted,
      updated: result.updated,
      total: result.store.records.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Restosuite sync failed" },
      { status: 500 },
    );
  }
}
