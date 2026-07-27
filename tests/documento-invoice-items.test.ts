import assert from "node:assert/strict";
import test from "node:test";
import { parseDocumentoInvoiceItems } from "../lib/documentos/invoice-items";

test("preserves invoice product names and parses editable decimal fields", () => {
  const [item] = parseDocumentoInvoiceItems([{
    supplier_id: "42",
    raw_product_name: "  SALMÓN 7/8  ",
    normalized_product_id: "8bf38bc8-d2fd-4e67-a681-3ffb5aa12b1d",
    description: "Fresco",
    quantity: "12.5",
    unit: "kg",
    unit_price: "18.90",
    tax_rate: "10",
    line_total: "236.25",
  }]);

  assert.equal(item.raw_product_name, "SALMÓN 7/8");
  assert.equal(item.quantity, 12.5);
  assert.equal(item.unit_price, 18.9);
  assert.equal(item.line_total, 236.25);
  assert.equal(item.supplier_id, 42);
});

test("allows an empty invoice item list", () => {
  assert.deepEqual(parseDocumentoInvoiceItems([]), []);
});

test("rejects missing original product names and invalid numbers", () => {
  assert.throws(
    () => parseDocumentoInvoiceItems([{ raw_product_name: "", quantity: "1" }]),
    /nombre original/,
  );
  assert.throws(
    () => parseDocumentoInvoiceItems([{ raw_product_name: "SALMÓN", quantity: "no-numérico" }]),
    /número inválido/,
  );
});

test("rejects malformed normalized product identifiers", () => {
  assert.throws(
    () => parseDocumentoInvoiceItems([{ raw_product_name: "SALMÓN", normalized_product_id: "producto-1" }]),
    /producto normalizado inválido/,
  );
});
