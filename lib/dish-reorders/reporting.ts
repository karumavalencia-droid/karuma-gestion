import type {
  DishReorderDailyRecord,
  DishReorderInsight,
} from "./types";

export type DishReorderRollup = {
  daysWithData: number;
  coveredOrders: number;
  updatedAt: string | null;
  records: DishReorderInsight[];
};

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function summarizeDishReorders(
  dailyRecords: DishReorderDailyRecord[],
): DishReorderRollup {
  const coverageByDate = new Map<string, number>();
  const byItem = new Map<
    string,
    Omit<DishReorderInsight, "reorderRate" | "averageGapMinutes"> & {
      gapMinutesSum: number;
      gapSamples: number;
    }
  >();
  let updatedAt: string | null = null;

  for (const record of dailyRecords) {
    coverageByDate.set(
      record.date,
      Math.max(coverageByDate.get(record.date) ?? 0, record.coveredOrders),
    );
    if (!updatedAt || record.syncedAt > updatedAt) updatedAt = record.syncedAt;

    const current = byItem.get(record.itemId) ?? {
      itemId: record.itemId,
      itemName: record.itemName,
      category: record.category,
      ordersWithItem: 0,
      reorderedOrders: 0,
      reorderEvents: 0,
      totalQty: 0,
      reorderQty: 0,
      gapMinutesSum: 0,
      gapSamples: 0,
    };
    current.itemName = record.itemName;
    current.category = record.category;
    current.ordersWithItem += record.ordersWithItem;
    current.reorderedOrders += record.reorderedOrders;
    current.reorderEvents += record.reorderEvents;
    current.totalQty += record.totalQty;
    current.reorderQty += record.reorderQty;
    current.gapMinutesSum += record.gapMinutesSum;
    current.gapSamples += record.gapSamples;
    byItem.set(record.itemId, current);
  }

  const records = [...byItem.values()]
    .map(
      (record): DishReorderInsight => ({
        itemId: record.itemId,
        itemName: record.itemName,
        category: record.category,
        ordersWithItem: record.ordersWithItem,
        reorderedOrders: record.reorderedOrders,
        reorderEvents: record.reorderEvents,
        totalQty: round(record.totalQty),
        reorderQty: round(record.reorderQty),
        reorderRate:
          record.ordersWithItem > 0
            ? round((record.reorderedOrders / record.ordersWithItem) * 100, 1)
            : 0,
        averageGapMinutes:
          record.gapSamples > 0
            ? round(record.gapMinutesSum / record.gapSamples, 1)
            : null,
      }),
    )
    .sort(
      (a, b) =>
        b.reorderedOrders - a.reorderedOrders ||
        b.reorderQty - a.reorderQty ||
        b.reorderRate - a.reorderRate ||
        a.itemName.localeCompare(b.itemName, "es"),
    );

  return {
    daysWithData: coverageByDate.size,
    coveredOrders: [...coverageByDate.values()].reduce((sum, value) => sum + value, 0),
    updatedAt,
    records,
  };
}
