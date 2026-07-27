import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/admin";
import type {
  DbDishReorderDaily,
  DbDishReorderDailyInsert,
} from "@/lib/supabase/types";
import type { DishReorderDailyRecord } from "./types";

export type ReadDishReorderOptions = {
  startDate?: string | null;
  endDate?: string | null;
  locationId?: string | null;
};

export function isDishReorderDbConfigured(): boolean {
  return isSupabaseConfigured();
}

function recordToRow(record: DishReorderDailyRecord): DbDishReorderDailyInsert {
  return {
    location_id: record.locationId,
    business_date: record.date,
    item_id: record.itemId,
    item_name: record.itemName,
    category: record.category || null,
    orders_with_item: record.ordersWithItem,
    reordered_orders: record.reorderedOrders,
    reorder_events: record.reorderEvents,
    total_qty: record.totalQty,
    reorder_qty: record.reorderQty,
    gap_minutes_sum: record.gapMinutesSum,
    gap_samples: record.gapSamples,
    covered_orders: record.coveredOrders,
    kds_rows: record.kdsRows,
    source: record.source,
    synced_at: record.syncedAt,
  };
}

function rowToRecord(row: DbDishReorderDaily): DishReorderDailyRecord {
  return {
    date: row.business_date,
    locationId: row.location_id,
    itemId: row.item_id,
    itemName: row.item_name,
    category: row.category ?? "",
    ordersWithItem: row.orders_with_item,
    reorderedOrders: row.reordered_orders,
    reorderEvents: row.reorder_events,
    totalQty: Number(row.total_qty),
    reorderQty: Number(row.reorder_qty),
    gapMinutesSum: Number(row.gap_minutes_sum),
    gapSamples: row.gap_samples,
    coveredOrders: row.covered_orders,
    kdsRows: row.kds_rows,
    source: row.source,
    syncedAt: row.synced_at ?? row.updated_at,
  };
}

export async function replaceDishReorderDays(options: {
  records: DishReorderDailyRecord[];
  locationId: string;
  businessDates: string[];
}): Promise<{ upserted: number; deleted: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) throw new Error("Supabase no está configurado");

  const businessDates = [...new Set(options.businessDates)].sort();
  const records = options.records.filter(
    (record) =>
      record.locationId === options.locationId &&
      businessDates.includes(record.date),
  );

  if (records.length > 0) {
    const { error } = await supabase
      .from("dish_reorder_daily")
      .upsert(records.map(recordToRow), {
        onConflict: "location_id,business_date,item_id",
      });
    if (error) throw new Error(error.message);
  }

  if (businessDates.length === 0) {
    return { upserted: records.length, deleted: 0 };
  }

  const { data: existingRows, error: selectError } = await supabase
    .from("dish_reorder_daily")
    .select("business_date,item_id")
    .eq("location_id", options.locationId)
    .in("business_date", businessDates);
  if (selectError) throw new Error(selectError.message);

  const currentKeys = new Set(
    records.map((record) => `${record.date}:${record.itemId}`),
  );
  const staleByDate = new Map<string, string[]>();
  for (const row of existingRows ?? []) {
    if (currentKeys.has(`${row.business_date}:${row.item_id}`)) continue;
    const stale = staleByDate.get(row.business_date) ?? [];
    stale.push(row.item_id);
    staleByDate.set(row.business_date, stale);
  }

  let deleted = 0;
  for (const [date, itemIds] of staleByDate) {
    const { error } = await supabase
      .from("dish_reorder_daily")
      .delete()
      .eq("location_id", options.locationId)
      .eq("business_date", date)
      .in("item_id", itemIds);
    if (error) throw new Error(error.message);
    deleted += itemIds.length;
  }

  return { upserted: records.length, deleted };
}

export async function readDishReorderDaily(
  options: ReadDishReorderOptions = {},
): Promise<DishReorderDailyRecord[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  let query = supabase
    .from("dish_reorder_daily")
    .select("*")
    .order("business_date", { ascending: true })
    .order("reordered_orders", { ascending: false });

  if (options.locationId) query = query.eq("location_id", options.locationId);
  if (options.startDate) query = query.gte("business_date", options.startDate);
  if (options.endDate) query = query.lte("business_date", options.endDate);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToRecord);
}
