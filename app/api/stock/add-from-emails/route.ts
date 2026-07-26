import { readFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export const runtime = "nodejs";

interface ProductoExtraido {
  nombre: string;
  proveedor: string;
  origen?: string;
}

interface ItemInventario {
  id: string;
  producto: string;
  categoria: string;
  stockActual: number;
  unidad: string;
  stockMinimo: number;
  estado: "correcto" | "bajo" | "critico";
}

export async function GET() {
  try {
    const projectRoot = process.cwd();
    const productsFile = join(projectRoot, "kosushi-products-from-emails.json");

    if (!existsSync(productsFile)) {
      return Response.json(
        { error: "No products file found from emails" },
        { status: 404 }
      );
    }

    // Read extracted products
    const content = await readFile(productsFile, "utf-8");
    const productos: ProductoExtraido[] = JSON.parse(content);

    // Read current inventory
    const inventarioFile = join(projectRoot, "lib/data/inventario.ts");
    let inventarioContent = "";
    if (existsSync(inventarioFile)) {
      inventarioContent = await readFile(inventarioFile, "utf-8");
    }

    // Parse current items (simple extraction from TS file)
    const currentItems: ItemInventario[] = [];
    const exportMatch = inventarioContent.match(/export const inventario:\s*ItemInventario\[\]\s*=\s*\[([\s\S]*?)\];/);
    if (exportMatch) {
      // For simplicity, we'll just count existing items to start ID from there
      const existingIds = inventarioContent.match(/id:\s*"(\d+)"/g) || [];
      currentItems.length = existingIds.length;
    }

    // Convert extracted products to inventory items
    const nextId = currentItems.length + 1;
    const newItems: ItemInventario[] = productos.map((p, idx) => ({
      id: String(nextId + idx),
      producto: p.nombre.trim(),
      categoria: mapProveedor(p.proveedor),
      stockActual: 0, // Unknown from invoice
      unidad: "uds", // Default unit
      stockMinimo: 5,
      estado: "bajo" as const,
    }));

    return Response.json({
      success: true,
      addedCount: newItems.length,
      items: newItems,
      message: `${newItems.length} products from ${productos.length} sources ready to add to inventory`,
    });
  } catch (error) {
    return Response.json(
      { error: "Failed to process products: " + String(error) },
      { status: 500 }
    );
  }
}

function mapProveedor(proveedor: string): string {
  const mapping: Record<string, string> = {
    kosushi: "Proveedores",
    makro_payments: "Proveedores",
    makro: "Proveedores",
    cominport: "Proveedores",
    facturaelectronica: "Secos",
    desconocido: "Otros",
  };
  return mapping[proveedor.toLowerCase()] || "Otros";
}
