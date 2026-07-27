import assert from "node:assert/strict";
import test from "node:test";
import { describeOperatingEvidence, previousAnalyticsRange, resolveAnalyticsRange, type OperatingAnalytics } from "../lib/analytics/operating";

test("uses a valid explicit analytics range and rejects impossible dates", () => {
  assert.deepEqual(resolveAnalyticsRange("2026-02-01", "2026-02-28"), { start: "2026-02-01", end: "2026-02-28" });
  const invalid = resolveAnalyticsRange("2026-02-30", "2026-02-28");
  assert.notEqual(invalid.start, "2026-02-30");
});

test("builds a previous period of equal inclusive length", () => {
  assert.deepEqual(previousAnalyticsRange("2026-06-10", "2026-06-16"), { start: "2026-06-03", end: "2026-06-09" });
});

test("evidence summary keeps known gaps explicit", () => {
  const analytics = {
    range: { start: "2026-06-01", end: "2026-06-30", previous: { start: "2026-05-02", end: "2026-05-31" } },
    metrics: { revenue: 1000, revenuePrevious: 900, revenueChangePct: 11.1, customers: 50, orders: 48, averageTicket: 20, drinkSales: 100, deliverySales: 75, purchaseConfirmed: 300, purchaseUnconfirmed: null, foodCostRate: 30, laborCostRate: null, platformCommissionRate: null, operatingProfitPartial: 700, operatingProfit: null, operatingProfitMargin: null, revenuePerOperatingHour: null, revenuePerEmployeeHour: null },
    metricStatus: { revenue: "confirmed" },
    sources: [],
    anomalies: [],
    purchaseAnalysis: { status: "missing", products: [], suppliers: [] },
    evidence: { confirmedInvoiceIds: [], unconfirmedInvoiceIds: [], topSupplierTotals: [] },
    dataCompleteness: 50,
  } as OperatingAnalytics;
  const summary = describeOperatingEvidence(analytics);
  assert.match(summary, /Ventas netas/);
  assert.match(summary, /excluye personal, alquiler, suministros y comisiones/i);
});
