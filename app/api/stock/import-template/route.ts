import { cominportProducts } from "@/src/data/cominportProducts";
import { jetExtramarProducts } from "@/src/data/jetExtramarProducts";

export const runtime = "nodejs";

export async function GET() {
  const productos = [
    ...cominportProducts.map((p) => ({
      nombre: p.nombre,
      categoria: p.categoria || "Cominport",
      unidad: "unidad",
      stock: 0,
      stockMinimo: 2,
      precio: 0,
      proveedor: "Cominport",
    })),
    ...jetExtramarProducts.map((p) => ({
      nombre: p.nombre,
      categoria: p.categoria || "Jet Extramar",
      unidad: "kg",
      stock: 0,
      stockMinimo: 1,
      precio: 0,
      proveedor: "Jet Extramar",
    })),
  ];

  return new Response(JSON.stringify(productos, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": "attachment; filename=stock-import.json",
    },
  });
}
