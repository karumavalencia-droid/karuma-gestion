import { NextResponse, type NextRequest } from "next/server";
import { normalizeSalesPayload } from "@/lib/sales-sync/normalize";
import {
  isDailySalesStorageConfigured,
  mergeDailySalesRecords,
} from "@/lib/sales-sync/storage";
import { canViewSales, getSessionUser, isSalesAdmin } from "@/lib/auth/guards";
import {
  deleteDailySale,
  isSalesDbConfigured,
  readDailySales,
} from "@/lib/sales-sync/supabaseRepo";
import { getDefaultLocationId } from "@/lib/sales-sync/config";

export const dynamic = "force-dynamic";

function todayInMadrid(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function isoDate(value: string | null): string | null {
  if (!value) return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim()) ? value.trim() : null;
}

function daysAgoInMadrid(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * GET /api/sales/daily
 * Lee el resumen diario unificado desde Supabase (tabla sales_daily).
 * Query: startDate, endDate (YYYY-MM-DD), locationId. Por defecto últimos 90 días.
 * Orden ascendente por business_date. Requiere sesión iniciada.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }
  if (!canViewSales(user)) {
    return NextResponse.json({ error: "Sin permisos para ver ventas" }, { status: 403 });
  }

  if (!isSalesDbConfigured()) {
    return NextResponse.json(
      { configured: false, updatedAt: null, records: [] },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const url = new URL(request.url);
    const startDate = isoDate(url.searchParams.get("startDate")) ?? daysAgoInMadrid(90);
    const endDate = isoDate(url.searchParams.get("endDate"));
    const locationId = url.searchParams.get("locationId");

    const records = await readDailySales({ startDate, endDate, locationId });
    const updatedAt = records.reduce<string | null>((latest, record) => {
      if (!record.syncedAt) return latest;
      return !latest || record.syncedAt > latest ? record.syncedAt : latest;
    }, null);

    return NextResponse.json(
      { configured: true, updatedAt, records },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to read daily sales" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/sales/daily?date=YYYY-MM-DD&locationId=...
 * Borra el resumen de un día (edición manual). Solo gestión (owner/manager).
 */
export async function DELETE(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }
  if (!canViewSales(user)) {
    return NextResponse.json({ error: "Sin permisos para ver ventas" }, { status: 403 });
  }
  if (!isSalesAdmin(user)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }
  if (!isSalesDbConfigured()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }

  const url = new URL(request.url);
  const date = isoDate(url.searchParams.get("date"));
  if (!date) {
    return NextResponse.json({ error: "Parámetro 'date' inválido" }, { status: 400 });
  }
  const locationId = url.searchParams.get("locationId") || getDefaultLocationId();

  try {
    await deleteDailySale(locationId, date);
    return NextResponse.json(
      { success: true },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo borrar" },
      { status: 500 },
    );
  }
}

/**
 * @deprecated Ruta antigua de webhook que escribe en el blob JSON. Se conserva
 * para permitir rollback, pero el camino de escritura soportado es
 * POST /api/sales/import (upsert a la tabla sales_daily). No usar para nuevas
 * integraciones. La lectura (GET, arriba) ya NO usa el blob.
 */
export async function POST(request: Request) {
  const secret = process.env.KARUMA_SYNC_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "KARUMA_SYNC_SECRET is not configured" }, { status: 503 });
  }
  if (request.headers.get("x-karuma-sync-key") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isDailySalesStorageConfigured()) {
    return NextResponse.json({ error: "Blob storage not configured" }, { status: 503 });
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
      deprecated: true,
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
