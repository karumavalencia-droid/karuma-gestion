// Sincronización diaria de ventas desde RestoSuite hacia la tabla `sales_daily`.
//
// RestoSuite no tiene envío programado de informes por email ni API pública
// contratada: lo que usamos es el endpoint JSON de su propio backoffice
// (ver lib/pos/restosuite-client.ts, que documenta el contrato y sus riesgos).
//
// Sin las variables de entorno de RestoSuite la ruta responde "no configurada"
// y NO hace ninguna petición externa. La importación manual de CSV
// (POST /api/sales/import) sigue disponible como alternativa.
import { NextResponse } from "next/server";
import {
  RestosuiteAuthError,
  fetchDailySales,
  getRestosuiteConfig,
} from "@/lib/pos/restosuite-client";
import { logImport, upsertDailySales } from "@/lib/sales-sync/supabaseRepo";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Tope de días por ejecución, para que un `days` enorme no agote la función. */
const MAX_RANGE_DAYS = 92;

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

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

function shiftDate(date: string, days: number): string {
  const shifted = new Date(`${date}T00:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function daysBetween(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  return Math.round((end - start) / 86_400_000) + 1;
}

/**
 * Rango a sincronizar. Por defecto sólo ayer (el día ya cerrado).
 *   ?date=2026-07-27          -> un día suelto
 *   ?start=...&end=...        -> rango explícito
 *   ?days=30                  -> los últimos 30 días hasta ayer (carga inicial)
 */
function resolveRange(url: URL): { startDate: string; endDate: string } | { error: string } {
  const date = url.searchParams.get("date");
  if (date) {
    if (!DATE_PATTERN.test(date)) return { error: "Parámetro `date` no válido (YYYY-MM-DD)" };
    return { startDate: date, endDate: date };
  }

  const start = url.searchParams.get("start");
  const end = url.searchParams.get("end");
  if (start || end) {
    if (!start || !end || !DATE_PATTERN.test(start) || !DATE_PATTERN.test(end)) {
      return { error: "Se requieren `start` y `end` en formato YYYY-MM-DD" };
    }
    if (start > end) return { error: "El rango de fechas está invertido" };
    if (daysBetween(start, end) > MAX_RANGE_DAYS) {
      return { error: `El rango no puede superar ${MAX_RANGE_DAYS} días` };
    }
    return { startDate: start, endDate: end };
  }

  const daysParam = url.searchParams.get("days");
  const yesterday = dateInMadrid(-1);
  if (daysParam) {
    const days = Number(daysParam);
    if (!Number.isInteger(days) || days < 1 || days > MAX_RANGE_DAYS) {
      return { error: `Parámetro \`days\` no válido (1-${MAX_RANGE_DAYS})` };
    }
    return { startDate: shiftDate(yesterday, -(days - 1)), endDate: yesterday };
  }

  return { startDate: yesterday, endDate: yesterday };
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = getRestosuiteConfig();
  if (!config) {
    return NextResponse.json(
      {
        success: false,
        configured: false,
        message:
          "Faltan las variables de RestoSuite (RESTOSUITE_TOKEN, RESTOSUITE_SHOP_ID, " +
          "RESTOSUITE_CORPORATION_ID, RESTOSUITE_BRAND_ID, RESTOSUITE_ORG_ID, " +
          "RESTOSUITE_ORG_TYPE). Mientras tanto, usa la importación manual de CSV " +
          "(/api/sales/import).",
      },
      { status: 503 },
    );
  }

  const range = resolveRange(new URL(request.url));
  if ("error" in range) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }

  try {
    const records = await fetchDailySales(range.startDate, range.endDate, config);

    if (records.length === 0) {
      // Un día sin ventas es un resultado legítimo, no un error: no escribimos ceros.
      await logImport({
        source: "restosuite-api",
        totalRows: 0,
        insertedRows: 0,
        updatedRows: 0,
        skippedRows: 0,
        status: "success",
      });
      return NextResponse.json({
        success: true,
        startDate: range.startDate,
        endDate: range.endDate,
        records: 0,
        inserted: 0,
        updated: 0,
        message: "RestoSuite no devolvió ventas para ese rango.",
      });
    }

    const result = await upsertDailySales(records);
    await logImport({
      source: "restosuite-api",
      totalRows: records.length,
      insertedRows: result.inserted,
      updatedRows: result.updated,
      skippedRows: 0,
      status: "success",
    });

    return NextResponse.json({
      success: true,
      startDate: range.startDate,
      endDate: range.endDate,
      records: records.length,
      inserted: result.inserted,
      updated: result.updated,
      netSalesTotal: records.reduce((sum, record) => sum + record.netSales, 0),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Fallo sincronizando RestoSuite";
    await logImport({
      source: "restosuite-api",
      totalRows: 0,
      insertedRows: 0,
      updatedRows: 0,
      skippedRows: 0,
      status: "error",
      errorMessage: message,
    });

    // El token caducado es el fallo esperado y necesita acción manual:
    // se marca aparte para poder alertar sobre él.
    if (error instanceof RestosuiteAuthError) {
      return NextResponse.json(
        { success: false, authExpired: true, error: message },
        { status: 502 },
      );
    }
    return NextResponse.json({ success: false, error: message }, { status: 502 });
  }
}
