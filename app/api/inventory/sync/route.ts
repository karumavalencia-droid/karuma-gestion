import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/admin";

type SyncProduct = {
  nombre: string;
  categoria: string;
  stock: number;
  stockMinimo: number;
  unidad: string;
  precio: number;
  proveedor: string;
};

export async function POST(request: Request) {
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ error: "Supabase no está configurado" }, { status: 503 });

  const body = (await request.json()) as { products?: SyncProduct[] };
  const products = Array.isArray(body.products) ? body.products : [];
  if (products.length === 0) return NextResponse.json({ error: "products requerido" }, { status: 400 });

  let created = 0;
  let updated = 0;
  const errors: string[] = [];

  for (const product of products) {
    const name = typeof product.nombre === "string" ? product.nombre.trim() : "";
    if (!name) continue;

    const { data: existing, error: lookupError } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("name", name)
      .eq("active", true)
      .maybeSingle();

    if (lookupError) {
      errors.push(`${name}: ${lookupError.message}`);
      continue;
    }

    const values = {
      name,
      category: product.categoria || "Otros",
      unit: product.unidad || "ud",
      current_quantity: Math.max(0, Number(product.stock) || 0),
      minimum_quantity: Math.max(0, Number(product.stockMinimo) || 0),
      unit_cost: Math.max(0, Number(product.precio) || 0),
      supplier_name: product.proveedor || "",
      active: true,
    };

    const result = existing
      ? await supabase.from("inventory_items").update(values).eq("id", existing.id)
      : await supabase.from("inventory_items").insert(values);

    if (result.error) errors.push(`${name}: ${result.error.message}`);
    else if (existing) updated += 1;
    else created += 1;
  }

  return NextResponse.json({ created, updated, errors }, { status: errors.length ? 207 : 200 });
}
