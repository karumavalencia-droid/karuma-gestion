import {
  resolveRestosuiteReportConfig,
  RESTOSUITE_KDS_REPORT_SOURCE,
  RESTOSUITE_REPORT_SOURCE,
  type RestosuiteReportConfig,
} from "@/lib/sales-sync/config";
import type { DishReorderDailyRecord } from "@/lib/dish-reorders/types";
import type { DailySalesRecord } from "@/lib/sales-sync/types";

const SALES_REPORT_ID = "888001";
const PAYMENT_REPORT_ID = "198";
const KDS_ITEMS_REPORT_ID = "100300";
const QUERY_PATH = "/api/report/data/queryData";
const REQUEST_TIMEOUT_MS = 20_000;
const MAX_REPORT_PAGES = 20;

const SALES_FIELDS = [
  "D_businessDate",
  "D_shopName",
  "M_Order_COUNT_Orders",
  "M_Order_SUM_guests",
  "M_Order_SUM_netSales",
  "M_Order_SUM_totalPromotionAmount",
  "M_Order_SUM_excludedRevenueSurcharge",
  "M_Order_SUM_RoundingAmount",
  "M_Order_SUM_receivableSales",
  "M_Order_SUM_totalGrossSales",
  "M_Order_SUM_surcharge",
  "M_Order_SUM_tips",
  "M_Order_SUM_totalRefundAmount",
  "M_Order_SUM_includedRevenueSurcharge",
  "M_Order_AVG_netSalesByOrder",
  "M_Order_AVG_netSalesByGuest",
  "M_Order_AVG_totalGrossSalesByGuest",
  "M_Order_AVG_totalGrossSalesByOrder",
] as const;

const PAYMENT_FIELDS = [
  "D_businessDate",
  "D_shopId",
  "D_shopName",
  "D_paymentType",
  "D_payerType",
  "D_couponName",
  "D_paymentName",
  "D_orderType",
  "M_OrderPayment_COUNT_count",
  "M_OrderPayment_SUM_tips",
  "M_OrderPayment_SUM_refundAmount",
  "M_OrderPayment_SUM_paymentFee",
  "M_OrderPayment_SUM_netPaymentAmount",
  "M_OrderPayment_SUM_merchantReceiveAmount",
] as const;

const KDS_ITEM_FIELDS = [
  "D_businessDate",
  "D_shopName",
  "D_posOrderId",
  "D_itemName",
  "D_unit",
  "D_category",
  "D_tasteWay",
  "D_createdTime",
  "D_prepareStartTime",
  "D_prepareEndTime",
  "D_prepareName",
  "D_prepareDeviceId",
  "D_madeStartTime",
  "D_madeEndTime",
  "D_madeName",
  "D_madeDeviceId",
  "D_servedStartTime",
  "D_servedEndTime",
  "D_servedName",
  "D_servedDeviceId",
  "D_completionTime",
  "M_KDS_SUM_completionQty",
  "M_KDS_SUM_prepareTime",
  "M_KDS_SUM_madeTime",
  "M_KDS_SUM_servedTime",
  "M_KDS_SUM_countTime",
  "D_shopId",
] as const;

type ReportCell = {
  value?: unknown;
  displayValue?: string;
  abbrDisplayValue?: string;
};

export type RestosuiteReportRow = Record<string, ReportCell | unknown>;

type ReportQueryResponse = {
  code?: string | number;
  msg?: string;
  data?: {
    rows?: RestosuiteReportRow[];
    page?: {
      pageNo?: number;
      pageSize?: number;
      pageCount?: number;
      total?: number;
    };
  };
};

type ReportFilter = {
  fieldName: string;
  filterType: "RANGE" | "EQ" | "IN";
  filterValue: string[];
};

export type ReportQueryBody = {
  metricsByDimQryV2: unknown[];
  reportId: string;
  selectFields: readonly string[];
  aggFilters: unknown[];
  proportionProperty: { enable: false };
  dimAdditionalStrategy: unknown[];
  filters: ReportFilter[];
  page: { pageNo: number; pageSize: number };
  orderBy: Array<Record<string, "ASC" | "DESC">>;
};

export class RestosuiteAuthError extends Error {
  readonly code = "RESTOSUITE_REAUTH_REQUIRED";

  constructor() {
    super("La sesión de RestoSuite ha caducado; es necesario iniciar sesión de nuevo");
    this.name = "RestosuiteAuthError";
  }
}

export class RestosuiteReportError extends Error {
  readonly code = "RESTOSUITE_REPORT_ERROR";
}

function buildReportQuery(
  reportId: string,
  selectFields: readonly string[],
  startDate: string,
  endDate: string,
  config: Pick<RestosuiteReportConfig, "currency" | "shopId">,
): ReportQueryBody {
  return {
    metricsByDimQryV2: [],
    reportId,
    selectFields,
    aggFilters: [],
    proportionProperty: { enable: false },
    dimAdditionalStrategy: [],
    filters: [
      {
        fieldName: "D_businessDate",
        filterType: "RANGE",
        filterValue: [startDate, endDate],
      },
      {
        fieldName: "D_currency",
        filterType: "EQ",
        filterValue: [config.currency],
      },
      {
        fieldName: "D_shopId",
        filterType: "IN",
        filterValue: [config.shopId],
      },
    ],
    page: { pageNo: 1, pageSize: 100 },
    orderBy: [{ D_businessDate: "ASC" }],
  };
}

export function buildSalesReportQuery(
  startDate: string,
  endDate: string,
  config: Pick<RestosuiteReportConfig, "currency" | "shopId">,
): ReportQueryBody {
  return buildReportQuery(SALES_REPORT_ID, SALES_FIELDS, startDate, endDate, config);
}

export function buildPaymentReportQuery(
  startDate: string,
  endDate: string,
  config: Pick<RestosuiteReportConfig, "currency" | "shopId">,
): ReportQueryBody {
  const query = buildReportQuery(
    PAYMENT_REPORT_ID,
    PAYMENT_FIELDS,
    startDate,
    endDate,
    config,
  );
  // Payment reports have several rows per day. A deterministic multi-column
  // order prevents duplicates or gaps when the provider paginates the result.
  query.orderBy = [
    { D_businessDate: "ASC" },
    { D_paymentType: "ASC" },
    { D_payerType: "ASC" },
    { D_paymentName: "ASC" },
    { D_orderType: "ASC" },
  ];
  return query;
}

export function buildDishReorderReportQuery(
  startDate: string,
  endDate: string,
  config: Pick<RestosuiteReportConfig, "shopId">,
): ReportQueryBody {
  return {
    metricsByDimQryV2: [],
    reportId: KDS_ITEMS_REPORT_ID,
    selectFields: KDS_ITEM_FIELDS,
    aggFilters: [],
    proportionProperty: { enable: false },
    dimAdditionalStrategy: [],
    filters: [
      {
        fieldName: "D_businessDate",
        filterType: "RANGE",
        filterValue: [startDate, endDate],
      },
      {
        fieldName: "D_shopId",
        filterType: "IN",
        filterValue: [config.shopId],
      },
    ],
    page: { pageNo: 1, pageSize: 100 },
    // This is the exact stable shape emitted by the KDS report UI.
    orderBy: [],
  };
}

function buildHeaders(config: RestosuiteReportConfig): Headers {
  const headers = new Headers({
    Accept: "application/json",
    "Content-Type": "application/json",
    "vulcan-Token": config.token,
    "Corporation-Id": config.corporationId,
    "Brand-Id": config.brandId,
    "Shop-Id": config.shopId,
    "Organization-Id": config.organizationId,
    "Accept-Timezone": config.acceptTimezone,
    "Language-Code": config.languageCode,
    "Organization-Type": config.organizationType,
  });
  return headers;
}

function isAuthFailure(code: unknown, message: unknown): boolean {
  const normalizedCode = String(code ?? "");
  const normalizedMessage = String(message ?? "");
  return (
    normalizedCode === "401" ||
    normalizedCode === "403" ||
    /未授权|登录|token|unauthori|forbidden|session/i.test(normalizedMessage)
  );
}

async function queryReportRows(
  config: RestosuiteReportConfig,
  body: ReportQueryBody,
): Promise<RestosuiteReportRow[]> {
  const rows: RestosuiteReportRow[] = [];

  for (let pageNo = 1; pageNo <= MAX_REPORT_PAGES; pageNo++) {
    const pageBody: ReportQueryBody = {
      ...body,
      page: { ...body.page, pageNo },
    };
    const response = await fetch(`${config.baseUrl}${QUERY_PATH}`, {
      method: "POST",
      headers: buildHeaders(config),
      body: JSON.stringify(pageBody),
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (response.status === 401 || response.status === 403) {
      throw new RestosuiteAuthError();
    }

    let payload: ReportQueryResponse;
    try {
      payload = (await response.json()) as ReportQueryResponse;
    } catch {
      throw new RestosuiteReportError(
        `RestoSuite devolvió una respuesta no válida (${response.status})`,
      );
    }

    if (isAuthFailure(payload.code, payload.msg)) {
      throw new RestosuiteAuthError();
    }
    if (!response.ok || String(payload.code) !== "000") {
      const providerMessage = payload.msg?.trim();
      throw new RestosuiteReportError(
        providerMessage
          ? `RestoSuite rechazó el informe: ${providerMessage}`
          : `RestoSuite devolvió el código ${String(payload.code ?? response.status)}`,
      );
    }

    const pageRows = Array.isArray(payload.data?.rows) ? payload.data.rows : [];
    rows.push(...pageRows);

    const pageCount = Number(payload.data?.page?.pageCount ?? 1);
    if (!Number.isFinite(pageCount) || pageNo >= pageCount) return rows;
  }

  throw new RestosuiteReportError(
    `El informe supera el límite de ${MAX_REPORT_PAGES} páginas`,
  );
}

function cellValue(row: RestosuiteReportRow, field: string): unknown {
  const cell = row[field];
  if (cell && typeof cell === "object" && "value" in cell) {
    return (cell as ReportCell).value;
  }
  return cell;
}

function cellDisplayValue(row: RestosuiteReportRow, field: string): string {
  const cell = row[field];
  if (cell && typeof cell === "object" && "displayValue" in cell) {
    return String((cell as ReportCell).displayValue ?? "");
  }
  return String(cellValue(row, field) ?? "");
}

function numberValue(row: RestosuiteReportRow, field: string): number {
  const raw = cellValue(row, field);
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : 0;
  const parsed = Number(String(raw ?? "0").replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(row: RestosuiteReportRow, field: string): string {
  return String(cellValue(row, field) ?? "").trim();
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

type KdsItemGroup = {
  itemId: string;
  itemName: string;
  category: string;
  quantitiesByTime: Map<string, number>;
};

type KdsDateGroup = {
  orders: Map<string, Map<string, KdsItemGroup>>;
  rowCount: number;
};

type DishAggregate = Omit<
  DishReorderDailyRecord,
  "coveredOrders" | "kdsRows" | "source" | "syncedAt"
>;

function safeDateTimeMinutes(start: string, end: string): number | null {
  const startMs = Date.parse(start);
  const endMs = Date.parse(end);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs < startMs) {
    return null;
  }
  return (endMs - startMs) / 60_000;
}

export function mapRestosuiteRowsToDishReorders(options: {
  rows: RestosuiteReportRow[];
  locationId: string;
  syncedAt?: string;
}): DishReorderDailyRecord[] {
  const byDate = new Map<string, KdsDateGroup>();

  for (const row of options.rows) {
    const date = stringValue(row, "D_businessDate");
    const posOrderId = stringValue(row, "D_posOrderId");
    const itemName = cellDisplayValue(row, "D_itemName").trim();
    const itemValue = stringValue(row, "D_itemName");
    const createdTime = stringValue(row, "D_createdTime");
    const quantity = numberValue(row, "M_KDS_SUM_completionQty");
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      !posOrderId ||
      !itemName ||
      !createdTime ||
      quantity <= 0
    ) {
      continue;
    }

    const itemId =
      itemValue ||
      `name:${itemName.normalize("NFKC").trim().toLocaleLowerCase("es")}`;
    const dateGroup = byDate.get(date) ?? {
      orders: new Map<string, Map<string, KdsItemGroup>>(),
      rowCount: 0,
    };
    const order = dateGroup.orders.get(posOrderId) ?? new Map<string, KdsItemGroup>();
    const item = order.get(itemId) ?? {
      itemId,
      itemName,
      category: cellDisplayValue(row, "D_category").trim(),
      quantitiesByTime: new Map<string, number>(),
    };

    item.itemName = itemName;
    item.category = cellDisplayValue(row, "D_category").trim();
    item.quantitiesByTime.set(
      createdTime,
      (item.quantitiesByTime.get(createdTime) ?? 0) + quantity,
    );
    order.set(itemId, item);
    dateGroup.orders.set(posOrderId, order);
    dateGroup.rowCount += 1;
    byDate.set(date, dateGroup);
  }

  const syncedAt = options.syncedAt ?? new Date().toISOString();
  const result: DishReorderDailyRecord[] = [];

  for (const [date, dateGroup] of byDate) {
    const dishStats = new Map<string, DishAggregate>();

    for (const order of dateGroup.orders.values()) {
      for (const item of order.values()) {
        const timedQuantities = [...item.quantitiesByTime.entries()].sort(([a], [b]) =>
          a.localeCompare(b),
        );
        const existing = dishStats.get(item.itemId) ?? {
          date,
          locationId: options.locationId,
          itemId: item.itemId,
          itemName: item.itemName,
          category: item.category,
          ordersWithItem: 0,
          reorderedOrders: 0,
          reorderEvents: 0,
          totalQty: 0,
          reorderQty: 0,
          gapMinutesSum: 0,
          gapSamples: 0,
        };
        existing.itemName = item.itemName;
        existing.category = item.category;
        existing.ordersWithItem += 1;
        existing.totalQty += timedQuantities.reduce(
          (sum, [, quantity]) => sum + quantity,
          0,
        );

        if (timedQuantities.length > 1) {
          existing.reorderedOrders += 1;
          existing.reorderEvents += timedQuantities.length - 1;
          existing.reorderQty += timedQuantities
            .slice(1)
            .reduce((sum, [, quantity]) => sum + quantity, 0);

          const firstTime = timedQuantities[0][0];
          for (const [laterTime] of timedQuantities.slice(1)) {
            const gap = safeDateTimeMinutes(firstTime, laterTime);
            if (gap === null) continue;
            existing.gapMinutesSum += gap;
            existing.gapSamples += 1;
          }
        }

        dishStats.set(item.itemId, existing);
      }
    }

    for (const aggregate of dishStats.values()) {
      result.push({
        ...aggregate,
        totalQty: roundMoney(aggregate.totalQty),
        reorderQty: roundMoney(aggregate.reorderQty),
        gapMinutesSum: roundMoney(aggregate.gapMinutesSum),
        coveredOrders: dateGroup.orders.size,
        kdsRows: dateGroup.rowCount,
        source: RESTOSUITE_KDS_REPORT_SOURCE,
        syncedAt,
      });
    }
  }

  return result.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      b.reorderedOrders - a.reorderedOrders ||
      a.itemName.localeCompare(b.itemName, "es"),
  );
}

type PaymentTotals = {
  cash: number;
  card: number;
  delivery: number;
  unclassified: number;
  tips: number;
  refund: number;
  fees: number;
  netPayment: number;
  merchantReceive: number;
};

function emptyPaymentTotals(): PaymentTotals {
  return {
    cash: 0,
    card: 0,
    delivery: 0,
    unclassified: 0,
    tips: 0,
    refund: 0,
    fees: 0,
    netPayment: 0,
    merchantReceive: 0,
  };
}

function paymentBucket(row: RestosuiteReportRow): keyof Pick<
  PaymentTotals,
  "cash" | "card" | "delivery" | "unclassified"
> {
  const paymentTypeCode = stringValue(row, "D_paymentType");
  if (paymentTypeCode === "11") return "cash";
  if (paymentTypeCode === "13") return "card";
  if (paymentTypeCode === "97") return "delivery";

  const labels = [
    cellDisplayValue(row, "D_paymentType"),
    cellDisplayValue(row, "D_payerType"),
    cellDisplayValue(row, "D_paymentName"),
  ]
    .join(" ")
    .toLowerCase();

  if (/现金|cash|efectivo/.test(labels)) return "cash";
  if (/刷卡|银行卡|bank ?card|card|tarjeta/.test(labels)) return "card";
  if (/三方外卖|外卖|delivery|uber|glovo|just ?eat|takeout/.test(labels)) {
    return "delivery";
  }
  return "unclassified";
}

function aggregatePayments(rows: RestosuiteReportRow[]): Map<string, PaymentTotals> {
  const byDate = new Map<string, PaymentTotals>();
  for (const row of rows) {
    const date = stringValue(row, "D_businessDate");
    if (!date) continue;

    const totals = byDate.get(date) ?? emptyPaymentTotals();
    const merchantReceive = numberValue(row, "M_OrderPayment_SUM_merchantReceiveAmount");
    const bucket = paymentBucket(row);
    totals[bucket] += merchantReceive;
    totals.tips += numberValue(row, "M_OrderPayment_SUM_tips");
    totals.refund += numberValue(row, "M_OrderPayment_SUM_refundAmount");
    totals.fees += numberValue(row, "M_OrderPayment_SUM_paymentFee");
    totals.netPayment += numberValue(row, "M_OrderPayment_SUM_netPaymentAmount");
    totals.merchantReceive += merchantReceive;
    byDate.set(date, totals);
  }
  return byDate;
}

export function mapRestosuiteRowsToDailySales(options: {
  salesRows: RestosuiteReportRow[];
  paymentRows: RestosuiteReportRow[];
  locationId: string;
  shopId: string;
  syncedAt?: string;
}): DailySalesRecord[] {
  const paymentsByDate = aggregatePayments(options.paymentRows);
  const syncedAt = options.syncedAt ?? new Date().toISOString();

  return options.salesRows.flatMap((row): DailySalesRecord[] => {
    const date = stringValue(row, "D_businessDate");
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return [];

    const grossSales = numberValue(row, "M_Order_SUM_totalGrossSales");
    const netSales = numberValue(row, "M_Order_SUM_netSales");
    const orders = Math.round(numberValue(row, "M_Order_COUNT_Orders"));
    const customers = Math.round(numberValue(row, "M_Order_SUM_guests"));
    const reportedAverageTicket = numberValue(row, "M_Order_AVG_netSalesByOrder");
    const payment = paymentsByDate.get(date) ?? emptyPaymentTotals();

    return [
      {
        date,
        grossSales: roundMoney(grossSales),
        netSales: roundMoney(netSales),
        customers,
        orders,
        averageTicket: roundMoney(
          reportedAverageTicket || (orders > 0 ? netSales / orders : 0),
        ),
        drinkSales: 0,
        deliverySales: roundMoney(payment.delivery),
        cashSales: roundMoney(payment.cash),
        cardSales: roundMoney(payment.card),
        source: RESTOSUITE_REPORT_SOURCE,
        locationId: options.locationId,
        externalId: `restosuite:${options.shopId}:${date}`,
        notes: JSON.stringify({
          discountAmount: roundMoney(
            numberValue(row, "M_Order_SUM_totalPromotionAmount"),
          ),
          salesRefundAmount: roundMoney(
            numberValue(row, "M_Order_SUM_totalRefundAmount"),
          ),
          paymentRefundAmount: roundMoney(payment.refund),
          tipsAmount: roundMoney(payment.tips),
          paymentFeeAmount: roundMoney(payment.fees),
          paymentNetAmount: roundMoney(payment.netPayment),
          paymentMerchantReceiveAmount: roundMoney(payment.merchantReceive),
          unclassifiedPaymentAmount: roundMoney(payment.unclassified),
          reportIds: [SALES_REPORT_ID, PAYMENT_REPORT_ID],
        }),
        syncedAt,
      },
    ];
  });
}

export async function fetchRestosuiteDailySales(options: {
  startDate: string;
  endDate: string;
  locationId: string;
  config?: RestosuiteReportConfig;
}): Promise<DailySalesRecord[]> {
  const resolved =
    options.config ?? (await resolveRestosuiteReportConfig(options.locationId));
  const [salesRows, paymentRows] = await Promise.all([
    queryReportRows(
      resolved,
      buildSalesReportQuery(options.startDate, options.endDate, resolved),
    ),
    queryReportRows(
      resolved,
      buildPaymentReportQuery(options.startDate, options.endDate, resolved),
    ),
  ]);

  return mapRestosuiteRowsToDailySales({
    salesRows,
    paymentRows,
    locationId: options.locationId,
    shopId: resolved.shopId,
  });
}

export async function fetchRestosuiteDishReorders(options: {
  startDate: string;
  endDate: string;
  locationId: string;
  config?: RestosuiteReportConfig;
}): Promise<DishReorderDailyRecord[]> {
  const resolved =
    options.config ?? (await resolveRestosuiteReportConfig(options.locationId));
  const rows = await queryReportRows(
    resolved,
    buildDishReorderReportQuery(options.startDate, options.endDate, resolved),
  );
  return mapRestosuiteRowsToDishReorders({
    rows,
    locationId: options.locationId,
  });
}
