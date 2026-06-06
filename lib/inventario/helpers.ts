import { inventario } from "@/lib/data/inventario";
import {
  EstadoProductoInventario,
  MovimientoInventario,
  ProductoInventario,
} from "@/lib/types";

export const STORAGE_KEY = "karuma_inventario_v2";
export const HISTORIAL_KEY = "karuma_historial_v2";

export const CATEGORIAS_DEFAULT = [
  "Pescado y Marisco",
  "Arroces y Cereales",
  "Salsas y Condimentos",
  "Verduras",
  "Carnes",
  "Lácteos",
  "Secos",
  "Condimentos",
  "Bebidas",
  "Otros",
];

export const UNIDADES = ["kg", "g", "L", "ml", "ud", "uds", "hojas", "caja", "bote", "bolsa"];

const PROVEEDOR_POR_PRODUCTO: Record<string, string> = {
  "Arroz sushi (Koshihikari)": "Arroces Valencia",
  "Salmón fresco": "Pescados del Mediterráneo S.L.",
  "Atún rojo": "Pescados del Mediterráneo S.L.",
  "Pollo teriyaki": "Carnes El Carmen",
  Sepia: "Pescados del Mediterráneo S.L.",
  "Gambas peladas": "Pescados del Mediterráneo S.L.",
  "Alga nori": "Distribuciones Orientales",
  Wasabi: "Distribuciones Orientales",
  "Salsa de soja": "Distribuciones Orientales",
  "Vinagre de arroz": "Distribuciones Orientales",
  "Sésamo tostado": "Distribuciones Orientales",
  Aguacate: "Frutas y Verduras Ruzafa",
  Philadelphia: "Lácteos Mediterráneo",
  "Harina tempura": "Distribuciones Orientales",
  "Aceite de freír": "Distribuciones Orientales",
};

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function fmtQty(value: number): number {
  return parseFloat(value.toFixed(2));
}

export function fmtDate(ts: number): string {
  const d = new Date(ts);
  return (
    d.toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
    " " +
    d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
  );
}

export function getEstadoProducto(stock: number, stockMinimo: number): EstadoProductoInventario {
  if (stock <= 0) return "agotado";
  if (stockMinimo > 0 && stock <= stockMinimo) return "bajo";
  return "correcto";
}

export function getEstadoLabel(estado: EstadoProductoInventario): string {
  if (estado === "agotado") return "Agotado";
  if (estado === "bajo") return "Stock bajo";
  return "Correcto";
}

export function seedProductos(): ProductoInventario[] {
  return inventario.map((item) => ({
    id: item.id,
    nombre: item.producto,
    categoria: item.categoria,
    stock: item.stockActual,
    stockMinimo: item.stockMinimo,
    unidad: item.unidad,
    precio: 0,
    proveedor: PROVEEDOR_POR_PRODUCTO[item.producto] ?? "",
    createdAt: Date.now(),
  }));
}

function normalizeProduct(raw: unknown): ProductoInventario | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  if (typeof r.nombre === "string") {
    return {
      id: String(r.id ?? genId()),
      nombre: r.nombre.trim(),
      categoria: String(r.categoria ?? ""),
      stock: fmtQty(parseFloat(String(r.stock ?? 0)) || 0),
      stockMinimo: fmtQty(parseFloat(String(r.stockMinimo ?? 0)) || 0),
      unidad: String(r.unidad ?? "kg"),
      precio: fmtQty(parseFloat(String(r.precio ?? 0)) || 0),
      proveedor: String(r.proveedor ?? ""),
      createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
    };
  }

  if (typeof r.name === "string") {
    return {
      id: String(r.id ?? genId()),
      nombre: r.name.trim(),
      categoria: String(r.category ?? r.categoria ?? ""),
      stock: fmtQty(parseFloat(String(r.qty ?? r.stock ?? 0)) || 0),
      stockMinimo: fmtQty(parseFloat(String(r.minQty ?? r.stockMinimo ?? 0)) || 0),
      unidad: String(r.unit ?? r.unidad ?? "kg"),
      precio: fmtQty(parseFloat(String(r.precio ?? r.price ?? 0)) || 0),
      proveedor: String(r.proveedor ?? r.supplier ?? ""),
      createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
    };
  }

  if (typeof r.producto === "string") {
    return {
      id: String(r.id ?? genId()),
      nombre: r.producto.trim(),
      categoria: String(r.categoria ?? ""),
      stock: fmtQty(parseFloat(String(r.stockActual ?? r.stock ?? 0)) || 0),
      stockMinimo: fmtQty(parseFloat(String(r.stockMinimo ?? 0)) || 0),
      unidad: String(r.unidad ?? "kg"),
      precio: fmtQty(parseFloat(String(r.precio ?? 0)) || 0),
      proveedor: String(r.proveedor ?? ""),
      createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
    };
  }

  return null;
}

function normalizeMovimiento(raw: unknown): MovimientoInventario | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.productName !== "string" && typeof r.productId !== "string") return null;

  return {
    id: String(r.id ?? genId()),
    productId: String(r.productId ?? ""),
    productName: String(r.productName ?? ""),
    type: r.type === "salida" ? "salida" : "entrada",
    qty: fmtQty(parseFloat(String(r.qty ?? 0)) || 0),
    note: String(r.note ?? ""),
    ts: typeof r.ts === "number" ? r.ts : Date.now(),
  };
}

export function loadProductos(): ProductoInventario[] {
  if (typeof window === "undefined") return seedProductos();

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedProductos();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return seedProductos();

    const products = parsed
      .map(normalizeProduct)
      .filter((p): p is ProductoInventario => p !== null && p.nombre.length > 0);

    if (products.length === 0) {
      const seeded = seedProductos();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
    return products;
  } catch {
    const seeded = seedProductos();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

export function saveProductos(products: ProductoInventario[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

export function loadHistorial(): MovimientoInventario[] {
  if (typeof window === "undefined") return [];

  const raw = localStorage.getItem(HISTORIAL_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeMovimiento)
      .filter((m): m is MovimientoInventario => m !== null);
  } catch {
    return [];
  }
}

export function saveHistorial(historial: MovimientoInventario[]): void {
  localStorage.setItem(HISTORIAL_KEY, JSON.stringify(historial.slice(0, 500)));
}

export function computeStats(products: ProductoInventario[]) {
  const productos = products.length;
  const unidades = fmtQty(products.reduce((sum, p) => sum + p.stock, 0));
  const stockBajo = products.filter(
    (p) => p.stock > 0 && p.stockMinimo > 0 && p.stock <= p.stockMinimo,
  ).length;
  const agotados = products.filter((p) => p.stock <= 0).length;

  return { productos, unidades, stockBajo, agotados };
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportProductosCsv(products: ProductoInventario[]): void {
  const header = [
    "Nombre",
    "Categoría",
    "Stock",
    "Stock Mínimo",
    "Unidad",
    "Precio coste",
    "Proveedor",
    "Estado",
  ];
  const rows = products.map((p) => {
    const estado = getEstadoLabel(getEstadoProducto(p.stock, p.stockMinimo));
    return [
      `"${p.nombre.replace(/"/g, '""')}"`,
      `"${p.categoria.replace(/"/g, '""')}"`,
      fmtQty(p.stock),
      fmtQty(p.stockMinimo),
      `"${p.unidad.replace(/"/g, '""')}"`,
      fmtQty(p.precio),
      `"${p.proveedor.replace(/"/g, '""')}"`,
      `"${estado}"`,
    ];
  });
  downloadCsv([header, ...rows].map((r) => r.join(",")).join("\n"), "karuma_inventario.csv");
}

export const EMPTY_FORM = {
  nombre: "",
  categoria: "",
  stock: "",
  stockMinimo: "",
  unidad: "kg",
  precio: "",
  proveedor: "",
};

export type ProductoForm = typeof EMPTY_FORM;

export function productToForm(product: ProductoInventario): ProductoForm {
  return {
    nombre: product.nombre,
    categoria: product.categoria,
    stock: String(product.stock),
    stockMinimo: String(product.stockMinimo),
    unidad: product.unidad,
    precio: String(product.precio),
    proveedor: product.proveedor,
  };
}

export function parseForm(form: ProductoForm): Omit<ProductoInventario, "id" | "createdAt"> | null {
  const nombre = form.nombre.trim();
  const categoria = form.categoria.trim();
  if (!nombre || !categoria) return null;

  return {
    nombre,
    categoria,
    stock: fmtQty(parseFloat(form.stock) || 0),
    stockMinimo: fmtQty(parseFloat(form.stockMinimo) || 0),
    unidad: form.unidad || "kg",
    precio: fmtQty(parseFloat(form.precio) || 0),
    proveedor: form.proveedor.trim(),
  };
}
