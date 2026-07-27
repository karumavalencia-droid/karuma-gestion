const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type DocumentoInvoiceItemInput = {
  supplier_id: number | null;
  raw_product_name: string;
  normalized_product_id: string | null;
  description: string | null;
  quantity: number | null;
  unit: string | null;
  unit_price: number | null;
  tax_rate: number | null;
  line_total: number | null;
};

function nullableText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) || null : null;
}

function nullableNumber(value: unknown, maxAbsoluteValue: number) {
  if (value == null || (typeof value === "string" && !value.trim())) return null;
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) && Math.abs(parsed) <= maxAbsoluteValue ? parsed : Number.NaN;
}

export function parseDocumentoInvoiceItems(value: unknown): DocumentoInvoiceItemInput[] {
  if (!Array.isArray(value) || value.length > 200) {
    throw new Error("La factura debe contener entre 0 y 200 líneas");
  }

  return value.map((rawItem, index) => {
    if (!rawItem || typeof rawItem !== "object" || Array.isArray(rawItem)) {
      throw new Error(`La línea ${index + 1} no es válida`);
    }
    const item = rawItem as Record<string, unknown>;
    const rawProductName = nullableText(item.raw_product_name, 500);
    if (!rawProductName) throw new Error(`La línea ${index + 1} necesita el nombre original del producto`);

    const quantity = nullableNumber(item.quantity, 1_000_000);
    const unitPrice = nullableNumber(item.unit_price, 100_000_000);
    const taxRate = nullableNumber(item.tax_rate, 1_000);
    const lineTotal = nullableNumber(item.line_total, 100_000_000);
    if ([quantity, unitPrice, taxRate, lineTotal].some((number) => Number.isNaN(number))) {
      throw new Error(`La línea ${index + 1} contiene un número inválido`);
    }

    const normalizedProductId = nullableText(item.normalized_product_id, 36);
    if (normalizedProductId && !UUID_PATTERN.test(normalizedProductId)) {
      throw new Error(`La línea ${index + 1} contiene un producto normalizado inválido`);
    }

    const supplierId = nullableNumber(item.supplier_id, Number.MAX_SAFE_INTEGER);
    if (Number.isNaN(supplierId) || (supplierId != null && (!Number.isInteger(supplierId) || supplierId < 0))) {
      throw new Error(`La línea ${index + 1} contiene un proveedor inválido`);
    }

    return {
      supplier_id: supplierId,
      raw_product_name: rawProductName,
      normalized_product_id: normalizedProductId,
      description: nullableText(item.description, 500),
      quantity,
      unit: nullableText(item.unit, 80),
      unit_price: unitPrice,
      tax_rate: taxRate,
      line_total: lineTotal,
    };
  });
}
