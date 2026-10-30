import type { DbGasto, DbGastoCategoria } from "@/lib/supabase/types";

export const COST_CATEGORIES: Record<DbGastoCategoria, string> = {
  proveedores: "Compras de alimentos y bebidas",
  personal: "Salarios y personal",
  seguros_sociales: "Seguridad Social de empresa",
  alquiler: "Alquiler",
  suministros: "Electricidad, agua y gas",
  impuestos: "Impuestos y tasas",
  marketing: "Marketing",
  comisiones: "Comisiones TPV y plataformas",
  otros: "Seguros, gestoría, mantenimiento y otros",
};

export function monthRange(month: string) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
  const [year, m] = month.split("-").map(Number);
  if (year < 2000 || year > 2100) return null;
  return { start: `${month}-01`, end: m === 12 ? `${year + 1}-01-01` : `${year}-${String(m + 1).padStart(2, "0")}-01` };
}

export function madridMonth() {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Madrid", year: "numeric", month: "2-digit" }).formatToParts(new Date());
  return `${parts.find(p => p.type === "year")!.value}-${parts.find(p => p.type === "month")!.value}`;
}

const cents = (n: number) => Math.round(n * 100);
export type ProfitDocument = {
  id: string;
  title?: string | null;
  nombre?: string | null;
  categoria?: string | null;
  document_type?: string | null;
  fecha_documento?: string | null;
  periodo?: string | null;
  total?: number | null;
  subtotal?: number | null;
  metadata?: Record<string, unknown> | null;
};

function documentMonth(doc: ProfitDocument) {
  if (doc.fecha_documento && /^\d{4}-\d{2}/.test(doc.fecha_documento)) return doc.fecha_documento.slice(0, 7);
  if (doc.periodo && /^(20\d{2})[-_](0[1-9]|1[0-2])/.test(doc.periodo)) return doc.periodo.slice(0, 7).replace("_", "-");
  const source = [doc.title, doc.nombre, doc.metadata?.source_filename, doc.metadata?.filename].filter(Boolean).join(" ");
  return source.match(/(20\d{2})[-_](0[1-9]|1[0-2])/)?.[0].replace("_", "-") ?? null;
}

function documentAmount(doc: ProfitDocument) {
  const value = Number(doc.total ?? doc.subtotal ?? 0);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export function buildProfitReport(month: string, sales: { business_date: string; net_sales: number }[], expenses: DbGasto[], documents: ProfitDocument[] = []) {
  const revenueCents = sales.reduce((sum, row) => sum + cents(Number(row.net_sales)), 0);
  const monthDocs = documents.filter(doc => documentMonth(doc) === month);
  const invoiceDocs = monthDocs.filter(doc => doc.document_type === "invoice" || ["facturas", "proveedores"].includes(doc.categoria ?? ""));
  const payrollDocs = monthDocs.filter(doc => ["nominas", "payroll", "nóminas"].includes((doc.categoria ?? "").toLowerCase()) || /nómina|nomina|payroll/i.test(`${doc.title ?? ""} ${doc.nombre ?? ""}`));
  const isVerified = (doc: ProfitDocument) => doc.metadata?.human_verified === true || doc.metadata?.humanVerified === true;
  const pendingInvoices = invoiceDocs.filter(doc => !isVerified(doc));
  const pendingPayroll = payrollDocs.filter(doc => !isVerified(doc));
  const missingPayrollAmount = payrollDocs.filter(doc => documentAmount(doc) === null);
  const categories = Object.entries(COST_CATEGORIES).map(([key, label]) => {
    const rows = expenses.filter(row => row.categoria === key);
    return { key: key as DbGastoCategoria, label, amount: rows.reduce((sum, row) => sum + cents(Number(row.importe)), 0) / 100, records: rows.length };
  });
  const amount = (key: DbGastoCategoria) => categories.find(c => c.key === key)!.amount;
  const costsCents = categories.reduce((sum, row) => sum + cents(row.amount), 0);
  const revenue = revenueCents / 100;
  const result = (revenueCents - costsCents) / 100;
  const missing = categories.filter(c => c.records === 0).map(c => c.label);
  return {
    month, revenue: sales.length ? revenue : null, costs: costsCents / 100,
    result: sales.length && expenses.length ? result : null,
    margin: sales.length && expenses.length && revenue !== 0 ? Math.round(result / revenue * 1000) / 10 : null,
    purchases: amount("proveedores"), labor: Math.round((amount("personal") + amount("seguros_sociales")) * 100) / 100,
    grossResult: sales.length ? (revenueCents - cents(amount("proveedores"))) / 100 : null,
    salesDays: new Set(sales.map(row => row.business_date)).size,
    latestSale: sales.map(row => row.business_date).sort().at(-1) ?? null,
    categories, expenses, missing,
    status: "provisional" as const,
    pendingDocuments: { invoices: pendingInvoices.length, invoiceAmount: pendingInvoices.reduce((s, d) => s + (documentAmount(d) ?? 0), 0), payroll: pendingPayroll.length, missingPayrollAmount: missingPayrollAmount.length },
    notes: [
      "Resultado provisional: ventas netas registradas menos gastos registrados. Las categorías sin registros están pendientes, no confirmadas a cero.",
      "Los importes históricos de gastos no identifican el IVA deducible. Revisa su base fiscal antes del cierre contable.",
      "Compras no equivale a consumo: faltan ajustes de inventario, amortizaciones, financiación e impuesto sobre beneficios para obtener un resultado neto contable.",
      `${pendingInvoices.length} facturas de compra (${pendingInvoices.reduce((s, d) => s + (documentAmount(d) ?? 0), 0).toFixed(2)} €) están identificadas pero no confirmadas; no se han sumado al resultado.`,
      payrollDocs.length ? `${payrollDocs.length} nóminas identificadas; ${missingPayrollAmount.length} no tienen importe y no se han sumado.` : "No hay nóminas con importe utilizable para este mes.",
      "Revisa y registra cada documento una sola vez, incluyendo los ya anotados en Finanzas.",
    ],
  };
}

export type ProfitReport = ReturnType<typeof buildProfitReport> & { generatedAt: string; documentsToReview: number | null };

function csvCell(value: string | number) {
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s) && typeof value !== "number") s = `'${s}`;
  return `"${s.replaceAll('"', '""')}"`;
}

export function reportCsv(report: ProfitReport) {
  const rows: (string | number)[][] = [
    ["Karuma · Beneficio", report.month, "PROVISIONAL"],
    ["Actualizado", report.generatedAt],
    ["Ventas netas", report.revenue ?? "Sin datos"],
    ...report.categories.map(c => [c.label, c.amount, c.records ? `${c.records} registros` : "Pendiente"]),
    ["Total costes registrados", report.costs], ["Resultado provisional", report.result ?? "Sin datos"],
    ["Margen %", report.margin ?? "No disponible"],
    ["Facturas pendientes de confirmar", report.pendingDocuments.invoiceAmount, `${report.pendingDocuments.invoices} documentos`],
    ["Nóminas pendientes / sin importe", report.pendingDocuments.payroll, `${report.pendingDocuments.missingPayrollAmount} sin importe`],
    ...report.notes.map(note => ["Nota", note]),
    [], ["Fecha", "Categoría", "Concepto", "Importe registrado", "Fuente", "Referencia"],
    ...report.expenses.map(e => [e.fecha, COST_CATEGORIES[e.categoria], e.concepto, Number(e.importe), e.fuente, e.id]),
  ];
  return "\uFEFF" + rows.map(row => row.map(csvCell).join(";")).join("\r\n");
}
