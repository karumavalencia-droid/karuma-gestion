import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { summarizeDishReorders } from "@/lib/dish-reorders/reporting";
import {
  isDishReorderDbConfigured,
  readDishReorderDaily,
} from "@/lib/dish-reorders/supabaseRepo";
import { getDefaultLocationId } from "@/lib/sales-sync/config";

export const dynamic = "force-dynamic";

function isoDate(value: string | null): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value.trim())) return null;
  const parsed = new Date(`${value.trim()}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : value.trim();
}

function madridDate(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }

  const today = madridDate();
  const startDate =
    isoDate(request.nextUrl.searchParams.get("startDate")) ??
    `${today.slice(0, 7)}-01`;
  const endDate = isoDate(request.nextUrl.searchParams.get("endDate")) ?? today;
  if (startDate > endDate) {
    return NextResponse.json(
      { error: "startDate no puede ser posterior a endDate" },
      { status: 400 },
    );
  }

  if (!isDishReorderDbConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        startDate,
        endDate,
        updatedAt: null,
        daysWithData: 0,
        coveredOrders: 0,
        records: [],
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const dailyRecords = await readDishReorderDaily({
      startDate,
      endDate,
      locationId:
        request.nextUrl.searchParams.get("locationId") || getDefaultLocationId(),
    });
    const summary = summarizeDishReorders(dailyRecords);
    return NextResponse.json(
      {
        configured: true,
        startDate,
        endDate,
        ...summary,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudieron leer las repeticiones",
      },
      { status: 500 },
    );
  }
}
