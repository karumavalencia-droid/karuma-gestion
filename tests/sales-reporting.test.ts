import assert from "node:assert/strict";
import test from "node:test";
import {
  filterDailySales,
  parseDailySalesNotes,
  percentageChange,
  summarizeDailySales,
} from "../lib/sales-sync/reporting";
import type { DailySalesRecord } from "../lib/sales-sync/types";

function record(
  date: string,
  values: Partial<DailySalesRecord> = {},
): DailySalesRecord {
  return {
    date,
    grossSales: 100,
    netSales: 95,
    customers: 4,
    orders: 2,
    averageTicket: 47.5,
    drinkSales: 0,
    deliverySales: 5,
    cashSales: 30,
    cardSales: 60,
    source: "restosuite-internal-report",
    locationId: "karuma-valencia",
    externalId: `restosuite:test:${date}`,
    notes: JSON.stringify({
      discountAmount: 3,
      salesRefundAmount: 2,
      paymentRefundAmount: 1,
      tipsAmount: 0.5,
      unclassifiedPaymentAmount: 0,
    }),
    syncedAt: "2026-07-17T08:00:00.000Z",
    ...values,
  };
}

test("summarizes real sales and report-note metrics", () => {
  const summary = summarizeDailySales([
    record("2026-07-15"),
    record("2026-07-16", {
      grossSales: 200,
      netSales: 180,
      customers: 6,
      orders: 3,
      cashSales: 80,
      cardSales: 90,
      deliverySales: 10,
      notes: JSON.stringify({
        discountAmount: 15,
        paymentRefundAmount: 4,
        tipsAmount: 2,
      }),
    }),
  ]);

  assert.equal(summary.grossSales, 300);
  assert.equal(summary.netSales, 275);
  assert.equal(summary.orders, 5);
  assert.equal(summary.customers, 10);
  assert.equal(summary.averageTicket, 55);
  assert.equal(summary.cashSales, 110);
  assert.equal(summary.cardSales, 150);
  assert.equal(summary.deliverySales, 15);
  assert.equal(summary.discountAmount, 18);
  assert.equal(summary.paymentRefundAmount, 5);
  assert.equal(summary.tipsAmount, 2.5);
});

test("filters the selected date range inclusively", () => {
  const records = [
    record("2026-07-14"),
    record("2026-07-15"),
    record("2026-07-16"),
    record("2026-07-17"),
  ];

  assert.deepEqual(
    filterDailySales(records, "2026-07-15", "2026-07-16").map((item) => item.date),
    ["2026-07-15", "2026-07-16"],
  );
});

test("treats legacy free-text notes as empty report metadata", () => {
  assert.deepEqual(parseDailySalesNotes("importe manual"), {
    discountAmount: 0,
    salesRefundAmount: 0,
    paymentRefundAmount: 0,
    tipsAmount: 0,
    paymentFeeAmount: 0,
    paymentNetAmount: 0,
    paymentMerchantReceiveAmount: 0,
    unclassifiedPaymentAmount: 0,
  });
});

test("computes comparison percentage without dividing by zero", () => {
  assert.equal(percentageChange(120, 100), 20);
  assert.equal(percentageChange(90, 100), -10);
  assert.equal(percentageChange(100, 0), null);
});
