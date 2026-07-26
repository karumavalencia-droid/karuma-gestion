import { getDocumentoAdmin } from "@/lib/documentos/repository";

type SalesRow = Record<string, unknown>;
type DocumentoInvoiceRow = Record<string, unknown>;
type InvoiceItemRow = Record<string, unknown>;
type SupplierRow = Record<string, unknown>;

export type AnalyticsDataStatus = "confirmed" | "unconfirmed" | "estimated" | "partial" | "missing";

export type AnalyticsSource = {
  key: string;
  label: string;
  status: AnalyticsDataStatus;
  records: number;
  href: string;
  note?: string;
};

export type OperatingAnomaly = {
  type: string;
  severity: "warning" | "danger" | "info";
  title: string;
  detail: string;
  href: string;
};

export type ProductPurchaseAnalysis = {
  productName: string;
  unit: string | null;
  quantity: number;
  total: number;
  averageUnitPrice: number | null;
  previousAverageUnitPrice: number | null;
  priceChangePct: number | null;
  lineCount: number;
};

export type SupplierPurchaseAnalysis = {
  supplierId: number;
  supplierName: string;
  total: number;
  invoiceCount: number;
};

export type OperatingAnalytics = {
  range: { start: string; end: string; previous: { start: string; end: string } };
  metrics: {
    revenue: number | null;
    revenuePrevious: number | null;
    revenueChangePct: number | null;
    customers: number | null;
    orders: number | null;
    averageTicket: number | null;
    drinkSales: number | null;
    deliverySales: number | null;
    purchaseConfirmed: number | null;
    purchaseUnconfirmed: number | null;
    foodCostRate: number | null;
    laborCostRate: number | null;
    platformCommissionRate: number | null;
    operatingProfitPartial: number | null;
    operatingProfit: number | null;
    operatingProfitMargin: number | null;
    revenuePerOperatingHour: number | null;
    revenuePerEmployeeHour: number | null;
  };
  metricStatus: Record<string, AnalyticsDataStatus>;
  sources: AnalyticsSource[];
  anomalies: OperatingAnomaly[];
  purchaseAnalysis: {
    status: AnalyticsDataStatus;
    products: ProductPurchaseAnalysis[];
    suppliers: SupplierPurchaseAnalysis[];
  };
  evidence: {
    confirmedInvoiceIds: string[];
    unconfirmedInvoiceIds: string[];
    topSupplierTotals: Array<{ supplierId: number; amount: number }>;
  };
  dataCompleteness: number;
};

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function safeDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? null : value;
}

export function resolveAnalyticsRange(startInput: string | null, endInput: string | null) {
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const defaultStart = monthStart.toISOString().slice(0, 10);
  const defaultEnd = now.toISOString().slice(0, 10);
  const start = safeDate(startInput || "") || defaultStart;
  const end = safeDate(endInput || "") || defaultEnd;
  if (start > end) return { start: defaultStart, end: defaultEnd };
  return { start, end };
}

export function previousAnalyticsRange(start: string, end: string) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const days = Math.max(1, Math.round((endDate.getTime() - startDate.getTime()) / 86_400_000) + 1);
  const previousEnd = new Date(startDate);
  previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
  const previousStart = new Date(previousEnd);
  previousStart.setUTCDate(previousStart.getUTCDate() - days + 1);
  return { start: previousStart.toISOString().slice(0, 10), end: previousEnd.toISOString().slice(0, 10) };
}

function percentChange(current: number | null, previous: number | null) {
  if (current == null || previous == null || previous === 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

async function settle<T>(promise: PromiseLike<{ data: T | null; error: { message?: string } | null }>) {
  const result = await promise;
  return result.error
    ? { data: null as T | null, error: result.error.message || "Consulta no disponible" }
    : { data: result.data, error: null };
}

function statusForQuery(error: string | null, records: number, nonEmptyStatus: AnalyticsDataStatus = "confirmed"): AnalyticsDataStatus {
  if (error || records === 0) return "missing";
  return nonEmptyStatus;
}

function normalisedProductKey(name: string, unit: string) {
  return `${name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-ES").replace(/\s+/g, " ").trim()}::${unit.toLocaleLowerCase("es-ES")}`;
}

type ProductAggregate = {
  productName: string;
  unit: string | null;
  quantity: number;
  total: number;
  pricedQuantity: number;
  priceTotal: number;
  lineCount: number;
};

function aggregateInvoiceItems(rows: InvoiceItemRow[]) {
  const groups = new Map<string, ProductAggregate>();
  for (const row of rows) {
    const productName = stringValue(row.raw_product_name) || "Producto sin nombre";
    const unit = stringValue(row.unit) || null;
    const quantity = numberValue(row.quantity);
    const explicitLineTotal = numberValue(row.line_total);
    const unitPrice = numberValue(row.unit_price);
    const total = explicitLineTotal || (quantity > 0 && unitPrice > 0 ? quantity * unitPrice : 0);
    const key = normalisedProductKey(productName, unit || "");
    const current = groups.get(key) || { productName, unit, quantity: 0, total: 0, pricedQuantity: 0, priceTotal: 0, lineCount: 0 };
    current.quantity += quantity;
    current.total += total;
    if (quantity > 0 && (total > 0 || unitPrice > 0)) {
      current.pricedQuantity += quantity;
      current.priceTotal += total > 0 ? total : quantity * unitPrice;
    }
    current.lineCount += 1;
    groups.set(key, current);
  }
  return groups;
}

function toRounded(value: number) {
  return Number(value.toFixed(2));
}

export function describeOperatingEvidence(analytics: OperatingAnalytics): string {
  const lines: string[] = [];
  const { metrics, range, anomalies } = analytics;
  if (metrics.revenue != null) {
    const comparison = metrics.revenueChangePct == null ? "sin periodo comparable" : `${metrics.revenueChangePct >= 0 ? "+" : ""}${metrics.revenueChangePct}% frente al periodo anterior`;
    lines.push(`Ventas netas ${range.start}–${range.end}: ${metrics.revenue.toFixed(2)} € (${comparison}).`);
  } else {
    lines.push("No hay ventas diarias confirmadas para el periodo seleccionado.");
  }
  if (metrics.purchaseConfirmed != null) {
    lines.push(`Compras confirmadas por factura: ${metrics.purchaseConfirmed.toFixed(2)} €${metrics.foodCostRate == null ? "" : `; coste de compras sobre ventas: ${metrics.foodCostRate.toFixed(1)}%`}.`);
  }
  if (metrics.operatingProfitPartial != null) {
    lines.push(`Resultado parcial: ${metrics.operatingProfitPartial.toFixed(2)} €; excluye personal, alquiler, suministros y comisiones sin fuente confirmada.`);
  }
  for (const anomaly of anomalies.slice(0, 3)) lines.push(`${anomaly.title}: ${anomaly.detail}`);
  return lines.join(" ");
}

export async function buildOperatingAnalytics(input: { start: string; end: string }): Promise<OperatingAnalytics> {
  const supabase = getDocumentoAdmin();
  const previous = previousAnalyticsRange(input.start, input.end);
  const invoiceColumns = "id,title,nombre,document_date,amount_total,currency,human_verified,status,supplier_id,payment_status,invoice_number";
  const [salesCurrent, salesPrevious, invoices, previousInvoices, duplicates] = await Promise.all([
    settle<SalesRow[]>(supabase.from("sales_daily").select("business_date,net_sales,customers,orders,average_ticket,drink_sales,delivery_sales").gte("business_date", input.start).lte("business_date", input.end).order("business_date", { ascending: true })),
    settle<SalesRow[]>(supabase.from("sales_daily").select("business_date,net_sales,customers,orders,average_ticket,drink_sales,delivery_sales").gte("business_date", previous.start).lte("business_date", previous.end)),
    settle<DocumentoInvoiceRow[]>(supabase.from("documentos").select(invoiceColumns).is("deleted_at", null).eq("document_type", "invoice").gte("document_date", input.start).lte("document_date", input.end)),
    settle<DocumentoInvoiceRow[]>(supabase.from("documentos").select(invoiceColumns).is("deleted_at", null).eq("document_type", "invoice").gte("document_date", previous.start).lte("document_date", previous.end)),
    settle<Array<Record<string, unknown>>>(supabase.from("document_duplicate_candidates").select("id").eq("status", "pending")),
  ]);

  const currentSalesRows = salesCurrent.data || [];
  const previousSalesRows = salesPrevious.data || [];
  const currentSales = currentSalesRows.reduce((sum, row) => sum + numberValue(row.net_sales), 0);
  const priorSales = previousSalesRows.reduce((sum, row) => sum + numberValue(row.net_sales), 0);
  const customers = currentSalesRows.reduce((sum, row) => sum + numberValue(row.customers), 0);
  const orders = currentSalesRows.reduce((sum, row) => sum + numberValue(row.orders), 0);
  const drinkSales = currentSalesRows.reduce((sum, row) => sum + numberValue(row.drink_sales), 0);
  const deliverySales = currentSalesRows.reduce((sum, row) => sum + numberValue(row.delivery_sales), 0);

  const invoiceRows = invoices.data || [];
  const confirmedInvoices = invoiceRows.filter((row) => row.human_verified === true && numberValue(row.amount_total) > 0);
  const unconfirmedInvoices = invoiceRows.filter((row) => row.human_verified !== true && numberValue(row.amount_total) > 0);
  const confirmedInvoiceIds = confirmedInvoices.map((row) => String(row.id));
  const previousConfirmedInvoiceIds = (previousInvoices.data || []).filter((row) => row.human_verified === true && numberValue(row.amount_total) > 0).map((row) => String(row.id));
  const purchaseConfirmed = confirmedInvoices.reduce((sum, row) => sum + numberValue(row.amount_total), 0);
  const purchaseUnconfirmed = unconfirmedInvoices.reduce((sum, row) => sum + numberValue(row.amount_total), 0);
  const unpaidInvoices = invoiceRows.filter((row) => ["pending", "unpaid", "due"].includes(stringValue(row.payment_status).toLowerCase())).length;
  const foodCostRate = currentSalesRows.length > 0 && confirmedInvoices.length > 0 && currentSales > 0 ? Number(((purchaseConfirmed / currentSales) * 100).toFixed(1)) : null;
  const partialOperatingProfit = currentSalesRows.length > 0 && confirmedInvoices.length > 0 ? toRounded(currentSales - purchaseConfirmed) : null;

  const [currentItems, previousItems] = await Promise.all([
    confirmedInvoiceIds.length
      ? settle<InvoiceItemRow[]>(supabase.from("invoice_items").select("document_id,supplier_id,raw_product_name,normalized_product_id,description,quantity,unit,unit_price,tax_rate,line_total").in("document_id", confirmedInvoiceIds))
      : Promise.resolve({ data: [] as InvoiceItemRow[], error: null }),
    previousConfirmedInvoiceIds.length
      ? settle<InvoiceItemRow[]>(supabase.from("invoice_items").select("document_id,supplier_id,raw_product_name,normalized_product_id,description,quantity,unit,unit_price,tax_rate,line_total").in("document_id", previousConfirmedInvoiceIds))
      : Promise.resolve({ data: [] as InvoiceItemRow[], error: null }),
  ]);

  const supplierIds = [...new Set(confirmedInvoices.map((row) => numberValue(row.supplier_id)).filter((id) => id > 0))];
  const suppliers = supplierIds.length
    ? await settle<SupplierRow[]>(supabase.from("suppliers").select("id,name").in("id", supplierIds))
    : { data: [] as SupplierRow[], error: null };
  const supplierNames = new Map<number, string>((suppliers.data || []).map((supplier) => [numberValue(supplier.id), stringValue(supplier.name) || `Proveedor #${supplier.id}`]));

  const currentProductGroups = aggregateInvoiceItems(currentItems.data || []);
  const previousProductGroups = aggregateInvoiceItems(previousItems.data || []);
  const products: ProductPurchaseAnalysis[] = [...currentProductGroups.entries()].map(([key, current]) => {
    const prior = previousProductGroups.get(key);
    const averageUnitPrice = current.pricedQuantity > 0 ? toRounded(current.priceTotal / current.pricedQuantity) : null;
    const previousAverageUnitPrice = prior && prior.pricedQuantity > 0 ? toRounded(prior.priceTotal / prior.pricedQuantity) : null;
    return {
      productName: current.productName,
      unit: current.unit,
      quantity: toRounded(current.quantity),
      total: toRounded(current.total),
      averageUnitPrice,
      previousAverageUnitPrice,
      priceChangePct: percentChange(averageUnitPrice, previousAverageUnitPrice),
      lineCount: current.lineCount,
    };
  }).sort((a, b) => b.total - a.total).slice(0, 20);

  const supplierTotals = new Map<number, { total: number; invoiceIds: Set<string> }>();
  for (const row of confirmedInvoices) {
    const supplierId = numberValue(row.supplier_id);
    if (supplierId <= 0) continue;
    const current = supplierTotals.get(supplierId) || { total: 0, invoiceIds: new Set<string>() };
    current.total += numberValue(row.amount_total);
    current.invoiceIds.add(String(row.id));
    supplierTotals.set(supplierId, current);
  }
  const supplierAnalysis = [...supplierTotals.entries()]
    .map(([supplierId, totals]) => ({ supplierId, supplierName: supplierNames.get(supplierId) || `Proveedor #${supplierId}`, total: toRounded(totals.total), invoiceCount: totals.invoiceIds.size }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const anomalies: OperatingAnomaly[] = [];
  if (unconfirmedInvoices.length) {
    anomalies.push({ type: "unconfirmed_invoices", severity: "warning", title: "Facturas AI sin confirmar", detail: `${unconfirmedInvoices.length} factura(s) por ${purchaseUnconfirmed.toFixed(2)} € están excluidas del coste confirmado.`, href: "/documento?type=invoice" });
  }
  if ((duplicates.data?.length || 0) > 0) {
    anomalies.push({ type: "duplicate_documents", severity: "warning", title: "Duplicados pendientes", detail: `${duplicates.data?.length || 0} posible(s) duplicado(s) requieren revisión humana; no se ha eliminado ningún archivo.`, href: "/documento" });
  }
  if (unpaidInvoices > 0) {
    anomalies.push({ type: "unpaid_invoices", severity: "danger", title: "Facturas pendientes de pago", detail: `${unpaidInvoices} factura(s) están marcadas como pendientes o vencidas.`, href: "/documento?type=invoice" });
  }
  if (!currentSalesRows.length) {
    anomalies.push({ type: "missing_sales", severity: "info", title: "No hay ventas en el periodo", detail: "No se puede calcular coste de compras ni margen hasta importar ventas diarias en el servidor.", href: "/datos" });
  }
  for (const product of products.filter((item) => item.priceChangePct != null && Math.abs(item.priceChangePct) >= 10).slice(0, 5)) {
    anomalies.push({ type: "product_price_change", severity: Math.abs(product.priceChangePct || 0) >= 20 ? "danger" : "warning", title: `Variación de precio: ${product.productName}`, detail: `El precio medio por ${product.unit || "unidad"} cambió ${product.priceChangePct! >= 0 ? "+" : ""}${product.priceChangePct}% frente al periodo anterior (${product.previousAverageUnitPrice?.toFixed(2)} € → ${product.averageUnitPrice?.toFixed(2)} €).`, href: "/documento?type=invoice" });
  }

  const itemRecords = currentItems.data?.length || 0;
  const sources: AnalyticsSource[] = [
    { key: "sales", label: "Ventas RestoSuite / sales_daily", status: statusForQuery(salesCurrent.error, currentSalesRows.length), records: currentSalesRows.length, href: `/api/sales/daily?startDate=${input.start}&endDate=${input.end}`, note: salesCurrent.error || undefined },
    { key: "purchases_confirmed", label: "Facturas confirmadas", status: statusForQuery(invoices.error, confirmedInvoices.length), records: confirmedInvoices.length, href: "/documento?type=invoice", note: invoices.error || undefined },
    { key: "purchases_ai", label: "Facturas AI sin confirmar", status: unconfirmedInvoices.length ? "unconfirmed" : "missing", records: unconfirmedInvoices.length, href: "/documento?type=invoice" },
    { key: "purchase_lines", label: "Líneas de factura confirmadas", status: statusForQuery(currentItems.error, itemRecords), records: itemRecords, href: "/documento?type=invoice", note: currentItems.error || undefined },
    { key: "labor", label: "Coste de personal", status: "missing", records: 0, href: "/personal", note: "No existe aún una fuente de horas/coste confirmado en el servidor." },
    { key: "fixed_costs", label: "Alquiler, suministros y otros", status: "missing", records: 0, href: "/profit", note: "No existe aún una fuente de costes fijos confirmados en el servidor." },
    { key: "platform_commissions", label: "Comisiones de plataformas", status: "missing", records: 0, href: "/datos", note: "La fuente actual solo conserva ventas delivery, no las comisiones liquidadas." },
    { key: "payment_reconciliation", label: "Conciliación pagos / facturas", status: "missing", records: 0, href: "/documento", note: "Todavía no hay una relación de pago confirmada con factura." },
  ];
  const confirmedSources = sources.filter((source) => source.status === "confirmed").length;

  return {
    range: { ...input, previous },
    metrics: {
      revenue: currentSalesRows.length ? toRounded(currentSales) : null,
      revenuePrevious: previousSalesRows.length ? toRounded(priorSales) : null,
      revenueChangePct: percentChange(currentSalesRows.length ? currentSales : null, previousSalesRows.length ? priorSales : null),
      customers: currentSalesRows.length ? customers : null,
      orders: currentSalesRows.length ? orders : null,
      averageTicket: currentSalesRows.length && customers > 0 ? toRounded(currentSales / customers) : null,
      drinkSales: currentSalesRows.length ? toRounded(drinkSales) : null,
      deliverySales: currentSalesRows.length ? toRounded(deliverySales) : null,
      purchaseConfirmed: confirmedInvoices.length ? toRounded(purchaseConfirmed) : null,
      purchaseUnconfirmed: unconfirmedInvoices.length ? toRounded(purchaseUnconfirmed) : null,
      foodCostRate,
      laborCostRate: null,
      platformCommissionRate: null,
      operatingProfitPartial: partialOperatingProfit,
      operatingProfit: null,
      operatingProfitMargin: null,
      revenuePerOperatingHour: null,
      revenuePerEmployeeHour: null,
    },
    metricStatus: {
      revenue: statusForQuery(salesCurrent.error, currentSalesRows.length),
      customers: statusForQuery(salesCurrent.error, currentSalesRows.length),
      purchases: statusForQuery(invoices.error, confirmedInvoices.length),
      foodCost: foodCostRate == null ? "missing" : "confirmed",
      partialOperatingProfit: partialOperatingProfit == null ? "missing" : "partial",
      operatingProfit: "missing",
      laborCost: "missing",
      platformCommission: "missing",
    },
    sources,
    anomalies,
    purchaseAnalysis: {
      status: statusForQuery(currentItems.error, itemRecords),
      products,
      suppliers: supplierAnalysis,
    },
    evidence: {
      confirmedInvoiceIds,
      unconfirmedInvoiceIds: unconfirmedInvoices.map((row) => String(row.id)),
      topSupplierTotals: supplierAnalysis.map((supplier) => ({ supplierId: supplier.supplierId, amount: supplier.total })),
    },
    dataCompleteness: Math.round((confirmedSources / sources.length) * 100),
  };
}
