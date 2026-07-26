import realProducts from "@/all-real-products.json";

export const runtime = "nodejs";

export async function GET() {
  return new Response(JSON.stringify(realProducts, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=kosushi-products-from-invoices.json",
    },
  });
}
