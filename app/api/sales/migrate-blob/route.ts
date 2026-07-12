import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser, isSalesAdmin } from "@/lib/auth/guards";
import {
  isDailySalesStorageConfigured,
  readDailySalesStore,
} from "@/lib/sales-sync/storage";
import { isSalesDbConfigured, upsertDailySales, logImport } from "@/lib/sales-sync/supabaseRepo";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Migración puntual del blob JSON antiguo (karuma-private/sales/daily-sales.json)
 * a la tabla sales_daily. Solo administradores. No borra el blob (rollback).
 *
 * GET  -> ¿hay datos reales en el blob? Devuelve el conteo para que el admin
 *         decida si merece la pena migrar.
 * POST -> upsert de los registros del blob a sales_daily.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user || !isSalesAdmin(user)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }
  if (!isDailySalesStorageConfigured()) {
    return NextResponse.json({ configured: false, count: 0, updatedAt: null });
  }
  try {
    const store = await readDailySalesStore();
    return NextResponse.json(
      { configured: true, count: store.records.length, updatedAt: store.updatedAt },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "No se pudo leer el blob" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user || !isSalesAdmin(user)) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }
  if (!isSalesDbConfigured()) {
    return NextResponse.json({ error: "Base de datos no configurada" }, { status: 503 });
  }
  if (!isDailySalesStorageConfigured()) {
    return NextResponse.json({ error: "No hay blob configurado" }, { status: 503 });
  }

  try {
    const store = await readDailySalesStore();
    if (store.records.length === 0) {
      return NextResponse.json({ success: true, inserted: 0, updated: 0, count: 0 });
    }

    const { inserted, updated } = await upsertDailySales(store.records);
    await logImport({
      source: "blob-migration",
      fileName: "daily-sales.json",
      totalRows: store.records.length,
      insertedRows: inserted,
      updatedRows: updated,
      skippedRows: 0,
      status: "success",
    });

    return NextResponse.json(
      { success: true, inserted, updated, count: store.records.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Fallo al migrar el blob" },
      { status: 500 },
    );
  }
}
