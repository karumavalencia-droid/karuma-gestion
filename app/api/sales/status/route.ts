import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth/guards";
import { isPosApiConfigured } from "@/lib/sales-sync/config";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { DbSalesDaily, DbSalesImportLog } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

/** PostgREST: tabla ausente del esquema (migración sin ejecutar). */
const MISSING_TABLE_CODE = "PGRST205";

export type SalesStatusPayload = {
  configured: boolean;
  tableExists: boolean;
  totalRecords: number;
  firstDate: string | null;
  lastDate: string | null;
  lastSyncedAt: string | null;
  lastImport: {
    at: string;
    source: string;
    fileName: string | null;
    status: string;
    inserted: number;
    updated: number;
    skipped: number;
    errorMessage: string | null;
  } | null;
  /** "csv-manual" mientras el TPV no tenga API oficial configurada. */
  mode: "csv-manual" | "api-auto";
};

/**
 * GET /api/sales/status — estado de los datos de ventas para el panel Datos:
 * ¿existe la tabla?, rango de fechas, total, última importación y modo actual.
 */
export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }

  const mode: SalesStatusPayload["mode"] = isPosApiConfigured()
    ? "api-auto"
    : "csv-manual";

  const base: SalesStatusPayload = {
    configured: isSupabaseConfigured(),
    tableExists: false,
    totalRecords: 0,
    firstDate: null,
    lastDate: null,
    lastSyncedAt: null,
    lastImport: null,
    mode,
  };

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(base, { headers: { "Cache-Control": "no-store" } });
  }

  // GET (no HEAD): con head:true un 404 sin cuerpo no llega como error al
  // cliente supabase-js y una tabla sin migrar se reportaría como existente.
  const { count, error: countError } = await supabase
    .from("sales_daily")
    .select("business_date", { count: "exact" })
    .limit(1);

  if (countError) {
    // Tabla sin migrar (o error transitorio): informar sin romper el panel.
    return NextResponse.json(
      {
        ...base,
        tableExists: countError.code !== MISSING_TABLE_CODE ? base.tableExists : false,
        error:
          countError.code === MISSING_TABLE_CODE
            ? undefined
            : countError.message,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const [firstRow, lastRow, syncedRow, importRow] = await Promise.all([
    supabase
      .from("sales_daily")
      .select("business_date")
      .order("business_date", { ascending: true })
      .limit(1)
      .maybeSingle<Pick<DbSalesDaily, "business_date">>(),
    supabase
      .from("sales_daily")
      .select("business_date")
      .order("business_date", { ascending: false })
      .limit(1)
      .maybeSingle<Pick<DbSalesDaily, "business_date">>(),
    supabase
      .from("sales_daily")
      .select("synced_at")
      .not("synced_at", "is", null)
      .order("synced_at", { ascending: false })
      .limit(1)
      .maybeSingle<Pick<DbSalesDaily, "synced_at">>(),
    supabase
      .from("sales_import_log")
      .select(
        "created_at, source, file_name, status, inserted_rows, updated_rows, skipped_rows, error_message",
      )
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle<
        Pick<
          DbSalesImportLog,
          | "created_at"
          | "source"
          | "file_name"
          | "status"
          | "inserted_rows"
          | "updated_rows"
          | "skipped_rows"
          | "error_message"
        >
      >(),
  ]);

  const lastImport = importRow.data
    ? {
        at: importRow.data.created_at,
        source: importRow.data.source,
        fileName: importRow.data.file_name,
        status: importRow.data.status,
        inserted: importRow.data.inserted_rows,
        updated: importRow.data.updated_rows,
        skipped: importRow.data.skipped_rows,
        errorMessage: importRow.data.error_message,
      }
    : null;

  return NextResponse.json(
    {
      ...base,
      tableExists: true,
      totalRecords: count ?? 0,
      firstDate: firstRow.data?.business_date ?? null,
      lastDate: lastRow.data?.business_date ?? null,
      lastSyncedAt: syncedRow.data?.synced_at ?? null,
      lastImport,
    } satisfies SalesStatusPayload,
    { headers: { "Cache-Control": "no-store" } },
  );
}
