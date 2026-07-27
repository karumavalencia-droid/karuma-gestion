import type { DailySalesRecord } from "./types";

export type DailySalesNotes = {
  discountAmount: number;
  salesRefundAmount: number;
  paymentRefundAmount: number;
  tipsAmount: number;
  paymentFeeAmount: number;
  paymentNetAmount: number;
  paymentMerchantReceiveAmount: number;
  unclassifiedPaymentAmount: number;
};

export type DailySalesReportSummary = {
  grossSales: number;
  netSales: number;
  customers: number;
  orders: number;
  averageTicket: number;
  cashSales: number;
  cardSales: number;
  deliverySales: number;
  discountAmount: number;
  salesRefundAmount: number;
  paymentRefundAmount: number;
  tipsAmount: number;
  unclassifiedPaymentAmount: number;
};

const EMPTY_NOTES: DailySalesNotes = {
  discountAmount: 0,
  salesRefundAmount: 0,
  paymentRefundAmount: 0,
  tipsAmount: 0,
  paymentFeeAmount: 0,
  paymentNetAmount: 0,
  paymentMerchantReceiveAmount: 0,
  unclassifiedPaymentAmount: 0,
};

function finiteNumber(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function parseDailySalesNotes(notes: string): DailySalesNotes {
  if (!notes.trim()) return { ...EMPTY_NOTES };

  try {
    const parsed = JSON.parse(notes) as Record<string, unknown>;
    return {
      discountAmount: finiteNumber(parsed.discountAmount),
      salesRefundAmount: finiteNumber(parsed.salesRefundAmount),
      paymentRefundAmount: finiteNumber(parsed.paymentRefundAmount),
      tipsAmount: finiteNumber(parsed.tipsAmount),
      paymentFeeAmount: finiteNumber(parsed.paymentFeeAmount),
      paymentNetAmount: finiteNumber(parsed.paymentNetAmount),
      paymentMerchantReceiveAmount: finiteNumber(parsed.paymentMerchantReceiveAmount),
      unclassifiedPaymentAmount: finiteNumber(parsed.unclassifiedPaymentAmount),
    };
  } catch {
    return { ...EMPTY_NOTES };
  }
}

export function filterDailySales(
  records: DailySalesRecord[],
  startDate: string,
  endDate: string,
): DailySalesRecord[] {
  return records.filter((record) => record.date >= startDate && record.date <= endDate);
}

export function summarizeDailySales(
  records: DailySalesRecord[],
): DailySalesReportSummary {
  const summary: DailySalesReportSummary = {
    grossSales: 0,
    netSales: 0,
    customers: 0,
    orders: 0,
    averageTicket: 0,
    cashSales: 0,
    cardSales: 0,
    deliverySales: 0,
    discountAmount: 0,
    salesRefundAmount: 0,
    paymentRefundAmount: 0,
    tipsAmount: 0,
    unclassifiedPaymentAmount: 0,
  };

  for (const record of records) {
    const notes = parseDailySalesNotes(record.notes);
    summary.grossSales += record.grossSales;
    summary.netSales += record.netSales;
    summary.customers += record.customers;
    summary.orders += record.orders;
    summary.cashSales += record.cashSales;
    summary.cardSales += record.cardSales;
    summary.deliverySales += record.deliverySales;
    summary.discountAmount += notes.discountAmount;
    summary.salesRefundAmount += notes.salesRefundAmount;
    summary.paymentRefundAmount += notes.paymentRefundAmount;
    summary.tipsAmount += notes.tipsAmount;
    summary.unclassifiedPaymentAmount += notes.unclassifiedPaymentAmount;
  }

  summary.grossSales = roundMoney(summary.grossSales);
  summary.netSales = roundMoney(summary.netSales);
  summary.averageTicket = roundMoney(
    summary.orders > 0 ? summary.netSales / summary.orders : 0,
  );
  summary.cashSales = roundMoney(summary.cashSales);
  summary.cardSales = roundMoney(summary.cardSales);
  summary.deliverySales = roundMoney(summary.deliverySales);
  summary.discountAmount = roundMoney(summary.discountAmount);
  summary.salesRefundAmount = roundMoney(summary.salesRefundAmount);
  summary.paymentRefundAmount = roundMoney(summary.paymentRefundAmount);
  summary.tipsAmount = roundMoney(summary.tipsAmount);
  summary.unclassifiedPaymentAmount = roundMoney(summary.unclassifiedPaymentAmount);
  return summary;
}

export function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1_000) / 10;
}
