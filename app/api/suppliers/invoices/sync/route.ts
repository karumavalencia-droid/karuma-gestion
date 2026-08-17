import { NextResponse } from "next/server";
import { getLegacySupabaseAdmin } from "@/lib/supabase/legacy-client";

type InvoiceLine = {
  product_name?: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
  invoice_date?: string;
};

type GroupedInvoice = {
  id: string;
  date: string;
  items: Array<{ invoice_id: string; invoice_date: string; total_price?: number }>;
  total: number;
};

export async function POST(request: Request) {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const body = await request.json();
    const { supplier_id, invoices } = body;

    if (!supplier_id || !Array.isArray(invoices)) {
      return NextResponse.json(
        { error: "supplier_id y invoices array requeridos" },
        { status: 400 },
      );
    }

    // Insertar items de factura
    const items = invoices.flatMap((invoice) =>
      (invoice.items ?? []).map((item: InvoiceLine) => ({
        supplier_id,
        invoice_id: invoice.id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        invoice_date: invoice.date,
      })),
    );

    const { data, error } = await supabase
      .from("supplier_invoice_items")
      .insert(items)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Actualizar resumen de gastos
    const byMonth = new Map<string, { quantity: number; cost: number; count: number }>();

    items.forEach((item: InvoiceLine) => {
      const yearMonth = (item.invoice_date ?? "").substring(0, 7); // YYYY-MM
      const current = byMonth.get(yearMonth) || { quantity: 0, cost: 0, count: 0 };
      current.quantity += item.quantity ?? 0;
      current.cost += item.total_price ?? 0;
      current.count += 1;
      byMonth.set(yearMonth, current);
    });

    // Upsert summaries
    for (const [yearMonth, summary] of byMonth) {
      await supabase
        .from("supplier_spending_summary")
        .upsert({
          supplier_id,
          year_month: yearMonth,
          total_quantity: summary.quantity,
          total_cost: summary.cost,
          product_count: summary.count,
        });
    }

    return NextResponse.json({
      success: true,
      inserted: data?.length || 0,
      summaries_updated: byMonth.size,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    );
  }
}

// GET para obtener facturas sincronizadas
export async function GET(request: Request) {
  try {
    const supabase = getLegacySupabaseAdmin();
    if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });
    const url = new URL(request.url);
    const supplierId = url.searchParams.get("supplier_id");

    let query = supabase
      .from("supplier_invoice_items")
      .select("*")
      .order("invoice_date", { ascending: false });

    if (supplierId) {
      query = query.eq("supplier_id", parseInt(supplierId));
    }

    const { data, error } = await query.limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Agrupar por factura
    const invoicesMap = new Map<string, GroupedInvoice>();
    data?.forEach((item: { invoice_id: string; invoice_date: string; total_price?: number }) => {
      if (!invoicesMap.has(item.invoice_id)) {
        invoicesMap.set(item.invoice_id, {
          id: item.invoice_id,
          date: item.invoice_date,
          items: [],
          total: 0,
        });
      }
      const invoice = invoicesMap.get(item.invoice_id)!;
      invoice.items.push(item);
      invoice.total += item.total_price ?? 0;
    });

    return NextResponse.json({
      success: true,
      count: invoicesMap.size,
      invoices: Array.from(invoicesMap.values()),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error desconocido" },
      { status: 500 },
    );
  }
}
