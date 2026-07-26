import { NextResponse } from "next/server";
import {
  getDefaultLocationId,
  resolveRestosuiteReportConfig,
  RESTOSUITE_REPORT_SOURCE,
} from "@/lib/sales-sync/config";
import {
  replaceDishReorderDays,
} from "@/lib/dish-reorders/supabaseRepo";
import {
  isSalesDbConfigured,
  logImport,
  upsertDailySales,
} from "@/lib/sales-sync/supabaseRepo";
import {
  fetchRestosuiteDishReorders,
  fetchRestosuiteDailySales,
  RestosuiteAuthError,
  RestosuiteReportError,
} from "@/lib/restosuite/reportApi";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MAX_RANGE_DAYS = 93;
const MAX_KDS_RANGE_DAYS = 3;

function businessDateInMadrid(daysFromToday: number): string {
  const currentBusinessDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [year, month, day] = currentBusinessDate.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + daysFromToday));
  return shifted.toISOString().slice(0, 10);
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function daysBetween(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  return Math.floor((end - start) / 86_400_000) + 1;
}

function businessDatesBetween(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  for (
    let timestamp = Date.parse(`${startDate}T00:00:00Z`);
    timestamp <= Date.parse(`${endDate}T00:00:00Z`);
    timestamp += 86_400_000
  ) {
    dates.push(new Date(timestamp).toISOString().slice(0, 10));
  }
  return dates;
}

function readDateRange(request: Request):
  | { startDate: string; endDate: string }
  | { error: string } {
  const url = new URL(request.url);
  const singleDate = url.searchParams.get("date")?.trim();
  const startDate = singleDate || url.searchParams.get("startDate")?.trim() || businessDateInMadrid(-1);
  const endDate = singleDate || url.searchParams.get("endDate")?.trim() || businessDateInMadrid(0);

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    return { error: "Las fechas deben usar el formato YYYY-MM-DD" };
  }
  if (startDate > endDate) {
    return { error: "startDate no puede ser posterior a endDate" };
  }
  if (daysBetween(startDate, endDate) > MAX_RANGE_DAYS) {
    return { error: `El rango máximo es de ${MAX_RANGE_DAYS} días` };
  }
  return { startDate, endDate };
}

async function recordFailure(errorMessage: string): Promise<void> {
  await logImport({
    source: RESTOSUITE_REPORT_SOURCE,
    fileName: null,
    totalRows: 0,
    insertedRows: 0,
    updatedRows: 0,
    skippedRows: 0,
    status: "error",
    errorMessage,
  });
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dateRange = readDateRange(request);
  if ("error" in dateRange) {
    return NextResponse.json({ error: dateRange.error }, { status: 400 });
  }

  if (!isSalesDbConfigured()) {
    return NextResponse.json(
      { success: false, configured: false, message: "Supabase no está configurado." },
      { status: 503 },
    );
  }

  const locationId =
    process.env.RESTOSUITE_LOCATION_ID?.trim() || getDefaultLocationId();
  const fileName = `restosuite-${dateRange.startDate}_to_${dateRange.endDate}.json`;

  try {
    const reportConfig = await resolveRestosuiteReportConfig(locationId);
    const records = await fetchRestosuiteDailySales({
      ...dateRange,
      locationId,
      config: reportConfig,
    });
    const result = await upsertDailySales(records);
    const rangeDays = daysBetween(dateRange.startDate, dateRange.endDate);
    let dishReorders:
      | {
          skipped: false;
          rows: number;
          upserted: number;
          deleted: number;
        }
      | {
          skipped: true;
          reason: string;
        };

    if (rangeDays <= MAX_KDS_RANGE_DAYS) {
      const dishRecords = await fetchRestosuiteDishReorders({
        ...dateRange,
        locationId,
        config: reportConfig,
      });
      const dishResult = await replaceDishReorderDays({
        records: dishRecords,
        locationId,
        businessDates: businessDatesBetween(
          dateRange.startDate,
          dateRange.endDate,
        ),
      });
      dishReorders = {
        skipped: false,
        rows: dishRecords.length,
        ...dishResult,
      };
    } else {
      dishReorders = {
        skipped: true,
        reason: `Use daily batches for KDS ranges longer than ${MAX_KDS_RANGE_DAYS} days`,
      };
    }

    await logImport({
      source: RESTOSUITE_REPORT_SOURCE,
      fileName,
      totalRows: records.length,
      insertedRows: result.inserted,
      updatedRows: result.updated,
      skippedRows: 0,
      status: "success",
      errorMessage: null,
    });

    return NextResponse.json({
      success: true,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      inserted: result.inserted,
      updated: result.updated,
      total: records.length,
      noData: records.length === 0,
      dishReorders,
    });
  } catch (error) {
    if (error instanceof RestosuiteAuthError) {
      const message = `${error.code}: ${error.message}`;
      await recordFailure(message);
      return NextResponse.json(
        {
          success: false,
          reauthRequired: true,
          error: error.code,
          message: error.message,
        },
        { status: 502 },
      );
    }

    const safeMessage =
      error instanceof RestosuiteReportError
        ? `${error.code}: ${error.message}`
        : "RESTOSUITE_SYNC_FAILED: No se pudo completar la sincronización";
    await recordFailure(safeMessage);
    return NextResponse.json(
      { success: false, error: "RESTOSUITE_SYNC_FAILED", message: safeMessage },
      { status: 502 },
    );
  }
}
