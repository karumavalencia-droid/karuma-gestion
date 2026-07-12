import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type { DbSalesDaily, DbSalesDailyInsert } from "@/lib/supabase/types";
import type { DailySalesRecord } from "./types";

export type ReadDailySalesOptions = {
  startDate?: string | null;
  endDate?: string | null;
  locationId?: string | null;
  limit?: number;
};

export type UpsertResult = {
  inserted: number;
  updated: number;
};

export type ImportLogEntry = {
  source: string;
  fileName?: string | null;
  totalRows: number;
  insertedRows: number;
  updatedRows: number;
  skippedRows: number;
  status: "success" | "partial" | "error";
  errorMessage?: string | null;
};

export function isSalesDbConfigured(): boolean {
  return isSupabaseConfigured();
}

function recordToRow(record: DailySalesRecord): DbSalesDailyInsert {
  return {
    location_id: record.locationId,
    business_date: record.date,
    gross_sales: record.grossSales,
    net_sales: record.netSales,
    customers: record.customers,
    orders: record.orders,
    average_ticket: record.averageTicket,
    drink_sales: record.drinkSales,
    delivery_sales: record.deliverySales,
    cash_sales: record.cashSales,
    card_sales: record.cardSales,
    source: record.source,
    external_id: record.externalId,
    notes: record.notes || null,
    synced_at: record.syncedAt,
  };
}

function rowToRecord(row: DbSalesDaily): DailySalesRecord {
  return {
    date: row.business_date,
    grossSales: Number(row.gross_sales ?? row.net_sales ?? 0),
    netSales: Number(row.net_sales ?? 0),
    customers: row.customers ?? 0,
    orders: row.orders ?? 0,
    averageTicket: Number(row.average_ticket ?? 0),
    drinkSales: Number(row.drink_sales ?? 0),
    deliverySales: Number(row.delivery_sales ?? 0),
    cashSales: Number(row.cash_sales ?? 0),
    cardSales: Number(row.card_sales ?? 0),
    source: row.source,
    locationId: row.location_id,
    externalId: row.external_id,
    notes: row.notes ?? "",
    syncedAt: row.synced_at ?? row.updated_at,
  };
}

/**
 * Upsert idempotente en sales_daily por (location_id, business_date).
 * Calcula inserted vs updated consultando primero las claves existentes.
 * Reimportar el mismo CSV es idempotente: las mismas filas cuentan como updated,
 * sin crear duplicados.
 */
export async function upsertDailySales(
  records: DailySalesRecord[],
): Promise<UpsertResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase no está configurado");
  if (records.length === 0) return { inserted: 0, updated: 0 };

  // Deduplicar por clave dentro del mismo lote (última fila gana).
  const byKey = new Map<string, DailySalesRecord>();
  for (const record of records) {
    byKey.set(`${record.locationId}:${record.date}`, record);
  }
  const deduped = [...byKey.values()];

  const locationIds = [...new Set(deduped.map((r) => r.locationId))];
  const dates = deduped.map((r) => r.date);

  // Claves ya existentes para distinguir inserted de updated.
  const { data: existingRows, error: selectError } = await supabase
    .from("sales_daily")
    .select("location_id, business_date")
    .in("location_id", locationIds)
    .in("business_date", dates);
  if (selectError) throw new Error(selectError.message);

  const existingKeys = new Set(
    (existingRows ?? []).map(
      (row) => `${row.location_id}:${row.business_date}`,
    ),
  );

  const rows = deduped.map(recordToRow);
  const { error: upsertError } = await supabase
    .from("sales_daily")
    .upsert(rows, { onConflict: "location_id,business_date" });
  if (upsertError) throw new Error(upsertError.message);

  let inserted = 0;
  let updated = 0;
  for (const record of deduped) {
    if (existingKeys.has(`${record.locationId}:${record.date}`)) updated++;
    else inserted++;
  }
  return { inserted, updated };
}

export async function readDailySales(
  options: ReadDailySalesOptions = {},
): Promise<DailySalesRecord[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  let query = supabase
    .from("sales_daily")
    .select("*")
    .order("business_date", { ascending: true });

  if (options.locationId) query = query.eq("location_id", options.locationId);
  if (options.startDate) query = query.gte("business_date", options.startDate);
  if (options.endDate) query = query.lte("business_date", options.endDate);
  if (options.limit && options.limit > 0) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToRecord);
}

/** Borra un día concreto (usado por la edición manual en Objetivo). */
export async function deleteDailySale(
  locationId: string,
  businessDate: string,
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase no está configurado");
  const { error } = await supabase
    .from("sales_daily")
    .delete()
    .eq("location_id", locationId)
    .eq("business_date", businessDate);
  if (error) throw new Error(error.message);
  return true;
}

/** Registra el resultado de una importación (sin el contenido del CSV). */
export async function logImport(entry: ImportLogEntry): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;
  const { error } = await supabase.from("sales_import_log").insert({
    source: entry.source,
    file_name: entry.fileName ?? null,
    total_rows: entry.totalRows,
    inserted_rows: entry.insertedRows,
    updated_rows: entry.updatedRows,
    skipped_rows: entry.skippedRows,
    status: entry.status,
    error_message: entry.errorMessage ?? null,
  });
  // No propagamos errores de log: no deben tumbar una importación correcta.
  if (error) console.error("sales_import_log insert failed:", error.message);
}
