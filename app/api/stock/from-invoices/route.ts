import invoiceProducts from "@/invoices-final-products.json";

export const runtime = "nodejs";

export async function GET() {
  return new Response(JSON.stringify(invoiceProducts, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=invoices-products.json",
    },
  });
}
