import assert from "node:assert/strict";
import test from "node:test";
import { summarizeDishReorders } from "../lib/dish-reorders/reporting";
import type { DishReorderDailyRecord } from "../lib/dish-reorders/types";

function record(
  date: string,
  values: Partial<DishReorderDailyRecord> = {},
): DishReorderDailyRecord {
  return {
    date,
    locationId: "karuma-valencia",
    itemId: "item-gyoza",
    itemName: "GYOZA A LA PLANCHA",
    category: "ENTRANTES",
    ordersWithItem: 10,
    reorderedOrders: 2,
    reorderEvents: 2,
    totalQty: 20,
    reorderQty: 3,
    gapMinutesSum: 60,
    gapSamples: 2,
    coveredOrders: 30,
    kdsRows: 120,
    source: "restosuite-kds-report",
    syncedAt: `${date}T23:00:00.000Z`,
    ...values,
  };
}

test("rolls daily dish repetitions up without double-counting covered bills", () => {
  const summary = summarizeDishReorders([
    record("2026-07-15"),
    record("2026-07-15", {
      itemId: "item-gamba",
      itemName: "GAMBA AL AJILLO",
      ordersWithItem: 5,
      reorderedOrders: 2,
      reorderQty: 4,
      coveredOrders: 30,
    }),
    record("2026-07-16", {
      ordersWithItem: 6,
      reorderedOrders: 1,
      reorderEvents: 1,
      reorderQty: 2,
      gapMinutesSum: 15,
      gapSamples: 1,
      coveredOrders: 25,
    }),
  ]);

  assert.equal(summary.daysWithData, 2);
  assert.equal(summary.coveredOrders, 55);
  const gyoza = summary.records.find((item) => item.itemId === "item-gyoza");
  assert.ok(gyoza);
  assert.equal(gyoza.ordersWithItem, 16);
  assert.equal(gyoza.reorderedOrders, 3);
  assert.equal(gyoza.reorderRate, 18.8);
  assert.equal(gyoza.reorderQty, 5);
  assert.equal(gyoza.averageGapMinutes, 25);
  assert.equal(summary.records[0].itemId, "item-gyoza");
});
