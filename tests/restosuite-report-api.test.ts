import assert from "node:assert/strict";
import test from "node:test";
import {
  buildDishReorderReportQuery,
  buildPaymentReportQuery,
  buildSalesReportQuery,
  fetchRestosuiteDailySales,
  mapRestosuiteRowsToDishReorders,
  mapRestosuiteRowsToDailySales,
  type RestosuiteReportRow,
} from "../lib/restosuite/reportApi";
import type { RestosuiteReportConfig } from "../lib/sales-sync/config";

function cell(value: string, displayValue = value) {
  return { value, displayValue, abbrDisplayValue: displayValue };
}

const salesRows: RestosuiteReportRow[] = [
  {
    D_businessDate: cell("2026-07-16", "16/07/2026"),
    D_shopName: cell("shop-1", "Karuma Sushi"),
    M_Order_COUNT_Orders: cell("75"),
    M_Order_SUM_guests: cell("171"),
    M_Order_SUM_netSales: cell("4190.55", "EUR 4,190.55"),
    M_Order_SUM_totalPromotionAmount: cell("0.00", "EUR 0.00"),
    M_Order_SUM_totalGrossSales: cell("4193.00", "EUR 4,193.00"),
    M_Order_SUM_tips: cell("2.45", "EUR 2.45"),
    M_Order_SUM_totalRefundAmount: cell("0.00", "EUR 0.00"),
    M_Order_AVG_netSalesByOrder: cell("55.87", "EUR 55.87"),
  },
];

const paymentRows: RestosuiteReportRow[] = [
  {
    D_businessDate: cell("2026-07-16"),
    D_paymentType: cell("13", "线下刷卡"),
    D_payerType: cell("externalBankCard", "外部银行卡"),
    D_paymentName: cell("card-id", "TARJETA"),
    M_OrderPayment_COUNT_count: cell("51"),
    M_OrderPayment_SUM_tips: cell("2.45"),
    M_OrderPayment_SUM_refundAmount: cell("0.00"),
    M_OrderPayment_SUM_paymentFee: cell("0.00"),
    M_OrderPayment_SUM_netPaymentAmount: cell("2895.80"),
    M_OrderPayment_SUM_merchantReceiveAmount: cell("2893.35"),
  },
  {
    D_businessDate: cell("2026-07-16"),
    D_paymentType: cell("97", "三方外卖"),
    D_payerType: cell("uberEatsTakeout", "Uber Eats"),
    D_paymentName: cell("uber-id", "UberEats外卖"),
    M_OrderPayment_COUNT_count: cell("1"),
    M_OrderPayment_SUM_tips: cell("0.00"),
    M_OrderPayment_SUM_refundAmount: cell("0.00"),
    M_OrderPayment_SUM_paymentFee: cell("0.00"),
    M_OrderPayment_SUM_netPaymentAmount: cell("22.50"),
    M_OrderPayment_SUM_merchantReceiveAmount: cell("22.50"),
  },
  {
    D_businessDate: cell("2026-07-16"),
    D_paymentType: cell("11", "现金"),
    D_payerType: cell("cash", "现金"),
    D_paymentName: cell("cash-id", "现金"),
    M_OrderPayment_COUNT_count: cell("21"),
    M_OrderPayment_SUM_tips: cell("0.00"),
    M_OrderPayment_SUM_refundAmount: cell("0.00"),
    M_OrderPayment_SUM_paymentFee: cell("0.00"),
    M_OrderPayment_SUM_netPaymentAmount: cell("1190.05"),
    M_OrderPayment_SUM_merchantReceiveAmount: cell("1190.05"),
  },
  {
    D_businessDate: cell("2026-07-16"),
    D_paymentType: cell("97", "三方外卖"),
    D_payerType: cell("uberEatsTakeout", "Uber Eats"),
    D_paymentName: cell("uber-id", "UberEats外卖"),
    M_OrderPayment_COUNT_count: cell("3"),
    M_OrderPayment_SUM_tips: cell("0.00"),
    M_OrderPayment_SUM_refundAmount: cell("0.00"),
    M_OrderPayment_SUM_paymentFee: cell("0.00"),
    M_OrderPayment_SUM_netPaymentAmount: cell("84.65"),
    M_OrderPayment_SUM_merchantReceiveAmount: cell("84.65"),
  },
];

const kdsRows: RestosuiteReportRow[] = [
  {
    D_businessDate: cell("2026-07-16"),
    D_posOrderId: cell("order-a"),
    D_itemName: cell("item-gyoza", "GYOZA A LA PLANCHA"),
    D_category: cell("category-hot", "ENTRANTES CALIENTES"),
    D_createdTime: cell("2026-07-16T20:00:00"),
    M_KDS_SUM_completionQty: cell("2"),
  },
  {
    D_businessDate: cell("2026-07-16"),
    D_posOrderId: cell("order-a"),
    D_itemName: cell("item-gyoza", "GYOZA A LA PLANCHA"),
    D_category: cell("category-hot", "ENTRANTES CALIENTES"),
    D_createdTime: cell("2026-07-16T20:00:00"),
    M_KDS_SUM_completionQty: cell("1"),
  },
  {
    D_businessDate: cell("2026-07-16"),
    D_posOrderId: cell("order-a"),
    D_itemName: cell("item-gyoza", "GYOZA A LA PLANCHA"),
    D_category: cell("category-hot", "ENTRANTES CALIENTES"),
    D_createdTime: cell("2026-07-16T20:30:00"),
    M_KDS_SUM_completionQty: cell("1"),
  },
  {
    D_businessDate: cell("2026-07-16"),
    D_posOrderId: cell("order-b"),
    D_itemName: cell("item-gyoza", "GYOZA A LA PLANCHA"),
    D_category: cell("category-hot", "ENTRANTES CALIENTES"),
    D_createdTime: cell("2026-07-16T21:00:00"),
    M_KDS_SUM_completionQty: cell("3"),
  },
  {
    D_businessDate: cell("2026-07-16"),
    D_posOrderId: cell("order-c"),
    D_itemName: cell("item-gamba", "GAMBA AL AJILLO"),
    D_category: cell("category-grill", "A LA BRASA"),
    D_createdTime: cell("2026-07-16T22:00:00"),
    M_KDS_SUM_completionQty: cell("1"),
  },
  {
    D_businessDate: cell("2026-07-16"),
    D_posOrderId: cell("order-c"),
    D_itemName: cell("item-gamba", "GAMBA AL AJILLO"),
    D_category: cell("category-grill", "A LA BRASA"),
    D_createdTime: cell("2026-07-16T22:15:00"),
    M_KDS_SUM_completionQty: cell("2"),
  },
];

test("builds the exact daily report filters with a safe page size", () => {
  const config = { currency: "EUR", shopId: "shop-1" };
  const salesQuery = buildSalesReportQuery("2026-07-15", "2026-07-16", config);
  const paymentQuery = buildPaymentReportQuery("2026-07-15", "2026-07-16", config);

  assert.equal(salesQuery.reportId, "888001");
  assert.equal(paymentQuery.reportId, "198");
  assert.deepEqual(salesQuery.page, { pageNo: 1, pageSize: 100 });
  assert.deepEqual(salesQuery.orderBy, [{ D_businessDate: "ASC" }]);
  assert.deepEqual(paymentQuery.orderBy, [
    { D_businessDate: "ASC" },
    { D_paymentType: "ASC" },
    { D_payerType: "ASC" },
    { D_paymentName: "ASC" },
    { D_orderType: "ASC" },
  ]);
  assert.deepEqual(salesQuery.filters, [
    {
      fieldName: "D_businessDate",
      filterType: "RANGE",
      filterValue: ["2026-07-15", "2026-07-16"],
    },
    { fieldName: "D_currency", filterType: "EQ", filterValue: ["EUR"] },
    { fieldName: "D_shopId", filterType: "IN", filterValue: ["shop-1"] },
  ]);
});

test("builds the exact KDS item report with order timestamps", () => {
  const query = buildDishReorderReportQuery("2026-07-16", "2026-07-16", {
    shopId: "shop-1",
  });

  assert.equal(query.reportId, "100300");
  assert.deepEqual(query.page, { pageNo: 1, pageSize: 100 });
  assert.deepEqual(query.orderBy, []);
  assert.ok(query.selectFields.includes("D_posOrderId"));
  assert.ok(query.selectFields.includes("D_itemName"));
  assert.ok(query.selectFields.includes("D_createdTime"));
  assert.deepEqual(query.filters, [
    {
      fieldName: "D_businessDate",
      filterType: "RANGE",
      filterValue: ["2026-07-16", "2026-07-16"],
    },
    { fieldName: "D_shopId", filterType: "IN", filterValue: ["shop-1"] },
  ]);
});

test("counts only later orders, not several units ordered at the same time", () => {
  const records = mapRestosuiteRowsToDishReorders({
    rows: kdsRows,
    locationId: "karuma-valencia",
    syncedAt: "2026-07-17T08:00:00.000Z",
  });

  assert.equal(records.length, 2);
  const gyoza = records.find((record) => record.itemId === "item-gyoza");
  assert.ok(gyoza);
  assert.equal(gyoza.ordersWithItem, 2);
  assert.equal(gyoza.reorderedOrders, 1);
  assert.equal(gyoza.reorderEvents, 1);
  assert.equal(gyoza.totalQty, 7);
  assert.equal(gyoza.reorderQty, 1);
  assert.equal(gyoza.gapMinutesSum, 30);
  assert.equal(gyoza.gapSamples, 1);
  assert.equal(gyoza.coveredOrders, 3);
  assert.equal(gyoza.kdsRows, 6);

  const gamba = records.find((record) => record.itemId === "item-gamba");
  assert.ok(gamba);
  assert.equal(gamba.ordersWithItem, 1);
  assert.equal(gamba.reorderedOrders, 1);
  assert.equal(gamba.reorderQty, 2);
  assert.equal(gamba.gapMinutesSum, 15);
});

test("maps sales and payment reports into one idempotent daily sales row", () => {
  const records = mapRestosuiteRowsToDailySales({
    salesRows,
    paymentRows,
    locationId: "karuma-valencia",
    shopId: "shop-1",
    syncedAt: "2026-07-17T08:00:00.000Z",
  });

  assert.equal(records.length, 1);
  const record = records[0];
  assert.equal(record.date, "2026-07-16");
  assert.equal(record.grossSales, 4193);
  assert.equal(record.netSales, 4190.55);
  assert.equal(record.orders, 75);
  assert.equal(record.customers, 171);
  assert.equal(record.averageTicket, 55.87);
  assert.equal(record.cashSales, 1190.05);
  assert.equal(record.cardSales, 2893.35);
  assert.equal(record.deliverySales, 107.15);
  assert.equal(record.externalId, "restosuite:shop-1:2026-07-16");

  const notes = JSON.parse(record.notes) as Record<string, unknown>;
  assert.equal(notes.discountAmount, 0);
  assert.equal(notes.salesRefundAmount, 0);
  assert.equal(notes.paymentRefundAmount, 0);
  assert.equal(notes.tipsAmount, 2.45);
  assert.equal(notes.paymentMerchantReceiveAmount, 4190.55);
  assert.equal(notes.unclassifiedPaymentAmount, 0);
});

test("ignores aggregate rows that do not contain a business date", () => {
  const records = mapRestosuiteRowsToDailySales({
    salesRows: [{ M_Order_SUM_netSales: cell("4190.55") }],
    paymentRows: [],
    locationId: "karuma-valencia",
    shopId: "shop-1",
  });

  assert.deepEqual(records, []);
});

test("paginates report rows without exposing the session token", async () => {
  const originalFetch = globalThis.fetch;
  const requestedPages: Array<{ reportId: string; pageNo: number }> = [];
  const config: RestosuiteReportConfig = {
    baseUrl: "https://bo.eu.restosuite.ai",
    token: "test-secret-token",
    corporationId: "corp-1",
    brandId: "brand-1",
    shopId: "shop-1",
    organizationId: "org-1",
    organizationType: "shop",
    acceptTimezone: "UTC+2",
    languageCode: "zh_CN",
    currency: "EUR",
  };

  globalThis.fetch = async (_input, init) => {
    const body = JSON.parse(String(init?.body)) as {
      reportId: string;
      page: { pageNo: number };
    };
    const headers = new Headers(init?.headers);
    assert.equal(headers.get("vulcan-Token"), "test-secret-token");
    assert.equal(headers.get("Organization-Type"), "shop");
    requestedPages.push({ reportId: body.reportId, pageNo: body.page.pageNo });

    const rows =
      body.reportId === "888001"
        ? salesRows
        : body.page.pageNo === 1
          ? paymentRows.slice(0, 2)
          : paymentRows.slice(2);
    const pageCount = body.reportId === "888001" ? 1 : 2;

    return new Response(
      JSON.stringify({
        code: "000",
        msg: "ok",
        data: {
          rows,
          page: { pageNo: body.page.pageNo, pageSize: 100, pageCount },
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  };

  try {
    const records = await fetchRestosuiteDailySales({
      startDate: "2026-07-16",
      endDate: "2026-07-16",
      locationId: "karuma-valencia",
      config,
    });
    assert.equal(records[0]?.cashSales, 1190.05);
    assert.equal(records[0]?.deliverySales, 107.15);
    assert.deepEqual(
      requestedPages.filter((request) => request.reportId === "198"),
      [
        { reportId: "198", pageNo: 1 },
        { reportId: "198", pageNo: 2 },
      ],
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
});
