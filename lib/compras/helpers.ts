import { compras } from "@/lib/data/compras";
import {
  fmtQty,
  genId,
  loadHistorial,
  loadProductos,
  saveHistorial,
  saveProductos,
} from "@/lib/inventario/helpers";
import {
  ComprasStore,
  EstadoPedidoCompra,
  EstadoProveedor,
  MovimientoInventario,
  PedidoCompra,
  ProductoInventario,
  Proveedor,
} from "@/lib/types";

export { genId };

export const STORAGE_KEY = "karuma_compras_v1";

export const CATEGORIAS_PROVEEDOR = [
  "Pescado",
  "Bebidas",
  "General",
  "Distribución",
  "Verduras",
  "Carnes",
  "Lácteos",
  "Otros",
];

export const ESTADOS_PEDIDO = [
  { value: "pendiente", label: "Pendiente" },
  { value: "enviado", label: "Enviado" },
  { value: "recibido", label: "Recibido" },
  { value: "cancelado", label: "Cancelado" },
] as const;

export const ESTADOS_PROVEEDOR = [
  { value: "activo", label: "Activo" },
  { value: "inactivo", label: "Inactivo" },
] as const;

export const ALERTA_KEYWORDS = ["salmón", "arroz", "atún"] as const;

const PROVEEDOR_MAP: Record<string, string> = {
  "Pescados del Mediterráneo S.L.": "Proveedor Salmón",
  "Arroces Valencia": "Makro",
  "Distribuciones Orientales": "Transgourmet",
  "Carnes El Carmen": "Transgourmet",
  "Frutas y Verduras Ruzafa": "Makro",
  "Bebidas Levante": "Heineken",
  "Lácteos Mediterráneo": "Makro",
};

function seedProveedores(): Proveedor[] {
  return [
    {
      id: "prov-makro",
      nombre: "Makro",
      contacto: "Pedidos central",
      telefono: "+34 963 100 001",
      email: "pedidos@makro.es",
      categoria: "General",
      estado: "activo",
    },
    {
      id: "prov-trans",
      nombre: "Transgourmet",
      contacto: "Atención Valencia",
      telefono: "+34 963 100 002",
      email: "valencia@transgourmet.es",
      categoria: "Distribución",
      estado: "activo",
    },
    {
      id: "prov-salmon",
      nombre: "Proveedor Salmón",
      contacto: "Carlos Ruiz",
      telefono: "+34 600 111 222",
      email: "salmon@pescadosmed.es",
      categoria: "Pescado",
      estado: "activo",
    },
    {
      id: "prov-atun",
      nombre: "Proveedor Atún",
      contacto: "Laura Méndez",
      telefono: "+34 600 333 444",
      email: "atun@pescadosmed.es",
      categoria: "Pescado",
      estado: "activo",
    },
    {
      id: "prov-cocacola",
      nombre: "Coca-Cola",
      contacto: "Distribuidor Levante",
      telefono: "+34 963 100 005",
      email: "pedidos@cocacola.es",
      categoria: "Bebidas",
      estado: "activo",
    },
    {
      id: "prov-heineken",
      nombre: "Heineken",
      contacto: "Horeca Valencia",
      telefono: "+34 963 100 006",
      email: "horeca@heineken.es",
      categoria: "Bebidas",
      estado: "activo",
    },
  ];
}

function resolveProveedorNombre(compraProveedor: string, producto: string): string {
  const mapped = PROVEEDOR_MAP[compraProveedor];
  if (mapped) return mapped;
  const p = producto.toLowerCase();
  if (p.includes("salmón")) return "Proveedor Salmón";
  if (p.includes("atún")) return "Proveedor Atún";
  if (p.includes("cerveza") || p.includes("heineken")) return "Heineken";
  if (p.includes("coca")) return "Coca-Cola";
  return "Makro";
}

function seedPedidos(proveedores: Proveedor[]): PedidoCompra[] {
  return compras.map((c, i) => {
    const proveedorNombre = resolveProveedorNombre(c.proveedor, c.producto);
    const proveedor =
      proveedores.find((p) => p.nombre === proveedorNombre) ?? proveedores[0];

    let estado: EstadoPedidoCompra = "recibido";
    if (i === compras.length - 1) estado = "pendiente";
    if (i === compras.length - 2) estado = "enviado";

    return {
      id: c.id,
      numeroPedido: `PC-2026-${String(i + 1).padStart(3, "0")}`,
      fecha: c.fecha,
      proveedorId: proveedor.id,
      proveedorNombre: proveedor.nombre,
      producto: c.producto,
      cantidad: c.cantidad,
      unidad: c.unidad,
      coste: c.importe,
      estado,
    };
  });
}

export function seedCompras(): ComprasStore {
  const proveedores = seedProveedores();
  const pedidos = seedPedidos(proveedores);
  return { proveedores, pedidos, contadorPedido: pedidos.length + 1 };
}

function normalizeProveedor(raw: unknown): Proveedor | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const nombre = String(r.nombre ?? "").trim();
  if (!nombre) return null;

  return {
    id: String(r.id ?? genId()),
    nombre,
    contacto: String(r.contacto ?? ""),
    telefono: String(r.telefono ?? ""),
    email: String(r.email ?? ""),
    categoria: String(r.categoria ?? "Otros"),
    estado: r.estado === "inactivo" ? "inactivo" : "activo",
  };
}

function normalizePedido(raw: unknown): PedidoCompra | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const producto = String(r.producto ?? "").trim();
  if (!producto) return null;

  const estadoRaw = String(r.estado ?? "pendiente");
  const estado: EstadoPedidoCompra =
    estadoRaw === "enviado" || estadoRaw === "recibido" || estadoRaw === "cancelado"
      ? estadoRaw
      : "pendiente";

  return {
    id: String(r.id ?? genId()),
    numeroPedido: String(r.numeroPedido ?? `PC-${genId()}`),
    fecha: String(r.fecha ?? new Date().toISOString().slice(0, 10)),
    proveedorId: String(r.proveedorId ?? ""),
    proveedorNombre: String(r.proveedorNombre ?? r.proveedor ?? ""),
    producto,
    cantidad: fmtQty(parseFloat(String(r.cantidad ?? 0)) || 0),
    unidad: String(r.unidad ?? "kg"),
    coste: fmtQty(parseFloat(String(r.coste ?? r.importe ?? 0)) || 0),
    estado,
  };
}

export function loadCompras(): ComprasStore {
  if (typeof window === "undefined") return seedCompras();

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedCompras();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const proveedores = Array.isArray(parsed.proveedores)
      ? parsed.proveedores
          .map(normalizeProveedor)
          .filter((p): p is Proveedor => p !== null)
      : [];
    const pedidos = Array.isArray(parsed.pedidos)
      ? parsed.pedidos.map(normalizePedido).filter((p): p is PedidoCompra => p !== null)
      : [];

    if (proveedores.length === 0) {
      const seeded = seedCompras();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }

    const store: ComprasStore = {
      proveedores,
      pedidos,
      contadorPedido:
        typeof parsed.contadorPedido === "number"
          ? parsed.contadorPedido
          : pedidos.length + 1,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return store;
  } catch {
    const seeded = seedCompras();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

export function saveCompras(store: ComprasStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function generarNumeroPedido(contador: number): string {
  const year = new Date().getFullYear();
  return `PC-${year}-${String(contador).padStart(3, "0")}`;
}

export function computeStats(store: ComprasStore) {
  const pendientes = store.pedidos.filter(
    (p) => p.estado === "pendiente" || p.estado === "enviado",
  ).length;
  const recibidos = store.pedidos.filter((p) => p.estado === "recibido").length;
  const proveedoresActivos = store.proveedores.filter((p) => p.estado === "activo").length;

  const now = new Date();
  const mesActual = now.getMonth();
  const anioActual = now.getFullYear();
  const gastoMes = fmtQty(
    store.pedidos
      .filter((p) => {
        if (p.estado === "cancelado") return false;
        const d = new Date(p.fecha);
        return d.getMonth() === mesActual && d.getFullYear() === anioActual;
      })
      .reduce((sum, p) => sum + p.coste, 0),
  );

  return { pendientes, recibidos, gastoMes, proveedoresActivos };
}

export function findProductIndex(productos: ProductoInventario[], nombre: string): number {
  const n = nombre.toLowerCase().trim();

  let idx = productos.findIndex((p) => p.nombre.toLowerCase() === n);
  if (idx >= 0) return idx;

  idx = productos.findIndex(
    (p) => p.nombre.toLowerCase().includes(n) || n.includes(p.nombre.toLowerCase()),
  );
  if (idx >= 0) return idx;

  for (const key of ALERTA_KEYWORDS) {
    if (n.includes(key)) {
      idx = productos.findIndex((p) => p.nombre.toLowerCase().includes(key));
      if (idx >= 0) return idx;
    }
  }

  return -1;
}

export function recepcionarPedido(pedido: PedidoCompra): { ok: boolean; error?: string } {
  if (pedido.estado === "recibido") {
    return { ok: false, error: "El pedido ya está recibido" };
  }
  if (pedido.estado === "cancelado") {
    return { ok: false, error: "No se puede recibir un pedido cancelado" };
  }

  const productos = loadProductos();
  const idx = findProductIndex(productos, pedido.producto);
  if (idx === -1) {
    return { ok: false, error: `Producto «${pedido.producto}» no encontrado en inventario` };
  }

  const product = productos[idx];
  const nextProducts = [...productos];
  nextProducts[idx] = { ...product, stock: fmtQty(product.stock + pedido.cantidad) };
  saveProductos(nextProducts);

  const historial = loadHistorial();
  const entry: MovimientoInventario = {
    id: genId(),
    productId: product.id,
    productName: product.nombre,
    type: "entrada",
    qty: pedido.cantidad,
    note: `Recepción pedido ${pedido.numeroPedido}`,
    ts: Date.now(),
  };
  saveHistorial([entry, ...historial].slice(0, 500));

  return { ok: true };
}

export function getAlertasStock(productos: ProductoInventario[]) {
  return ALERTA_KEYWORDS.map((keyword) => {
    const producto = productos.find((p) => p.nombre.toLowerCase().includes(keyword));
    if (!producto) return null;
    const bajo =
      producto.stockMinimo > 0 &&
      producto.stock <= producto.stockMinimo;
    if (!bajo) return null;

    const label =
      keyword === "salmón" ? "Salmón" : keyword === "arroz" ? "Arroz" : "Atún";

    return {
      keyword,
      label,
      producto,
      mensaje: `${label} bajo stock (${fmtQty(producto.stock)} ${producto.unidad} / mín. ${fmtQty(producto.stockMinimo)})`,
    };
  }).filter((a): a is NonNullable<typeof a> => a !== null);
}

export function sugerirProveedor(
  producto: ProductoInventario,
  proveedores: Proveedor[],
): Proveedor | undefined {
  const activos = proveedores.filter((p) => p.estado === "activo");
  const nombre = producto.nombre.toLowerCase();

  if (nombre.includes("salmón")) {
    return activos.find((p) => p.nombre.toLowerCase().includes("salmón"));
  }
  if (nombre.includes("atún")) {
    return activos.find((p) => p.nombre.toLowerCase().includes("atún"));
  }
  if (producto.proveedor) {
    const match = activos.find((p) =>
      producto.proveedor.toLowerCase().includes(p.nombre.toLowerCase()),
    );
    if (match) return match;
  }

  return activos[0];
}

export function crearPedidoSugerido(
  producto: ProductoInventario,
  proveedores: Proveedor[],
  contador: number,
): PedidoCompra {
  const proveedor = sugerirProveedor(producto, proveedores);
  const cantidadSugerida = fmtQty(
    Math.max(producto.stockMinimo * 2 - producto.stock, producto.stockMinimo),
  );

  return {
    id: genId(),
    numeroPedido: generarNumeroPedido(contador),
    fecha: new Date().toISOString().slice(0, 10),
    proveedorId: proveedor?.id ?? "",
    proveedorNombre: proveedor?.nombre ?? "",
    producto: producto.nombre,
    cantidad: cantidadSugerida,
    unidad: producto.unidad,
    coste: 0,
    estado: "pendiente",
  };
}

export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob(["\uFEFF" + content], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function exportProveedoresCsv(proveedores: Proveedor[]): void {
  const header = ["Nombre", "Contacto", "Teléfono", "Email", "Categoría", "Estado"];
  const rows = proveedores.map((p) => [
    `"${p.nombre.replace(/"/g, '""')}"`,
    `"${p.contacto.replace(/"/g, '""')}"`,
    `"${p.telefono.replace(/"/g, '""')}"`,
    `"${p.email.replace(/"/g, '""')}"`,
    `"${p.categoria.replace(/"/g, '""')}"`,
    `"${p.estado}"`,
  ]);
  downloadCsv([header, ...rows].map((r) => r.join(",")).join("\n"), "karuma_proveedores.csv");
}

export function exportPedidosCsv(pedidos: PedidoCompra[]): void {
  const header = [
    "Número pedido",
    "Fecha",
    "Proveedor",
    "Producto",
    "Cantidad",
    "Unidad",
    "Coste €",
    "Estado",
  ];
  const rows = pedidos.map((p) => [
    `"${p.numeroPedido}"`,
    `"${p.fecha}"`,
    `"${p.proveedorNombre.replace(/"/g, '""')}"`,
    `"${p.producto.replace(/"/g, '""')}"`,
    p.cantidad,
    `"${p.unidad}"`,
    p.coste.toFixed(2),
    `"${p.estado}"`,
  ]);
  downloadCsv([header, ...rows].map((r) => r.join(",")).join("\n"), "karuma_pedidos.csv");
}

export const EMPTY_PROVEEDOR_FORM = {
  nombre: "",
  contacto: "",
  telefono: "",
  email: "",
  categoria: "General",
  estado: "activo" as EstadoProveedor,
};

export type ProveedorForm = typeof EMPTY_PROVEEDOR_FORM;

export function proveedorToForm(p: Proveedor): ProveedorForm {
  return {
    nombre: p.nombre,
    contacto: p.contacto,
    telefono: p.telefono,
    email: p.email,
    categoria: p.categoria,
    estado: p.estado,
  };
}

export function parseProveedorForm(
  form: ProveedorForm,
): Omit<Proveedor, "id"> | null {
  const nombre = form.nombre.trim();
  if (!nombre) return null;
  return {
    nombre,
    contacto: form.contacto.trim(),
    telefono: form.telefono.trim(),
    email: form.email.trim(),
    categoria: form.categoria.trim() || "Otros",
    estado: form.estado,
  };
}

export const EMPTY_PEDIDO_FORM = {
  fecha: new Date().toISOString().slice(0, 10),
  proveedorId: "",
  producto: "",
  cantidad: "",
  unidad: "kg",
  coste: "",
  estado: "pendiente" as EstadoPedidoCompra,
};

export type PedidoForm = typeof EMPTY_PEDIDO_FORM;

export function pedidoToForm(p: PedidoCompra): PedidoForm {
  return {
    fecha: p.fecha,
    proveedorId: p.proveedorId,
    producto: p.producto,
    cantidad: String(p.cantidad),
    unidad: p.unidad,
    coste: String(p.coste),
    estado: p.estado,
  };
}

export function parsePedidoForm(
  form: PedidoForm,
  proveedores: Proveedor[],
): Omit<PedidoCompra, "id" | "numeroPedido"> | null {
  const producto = form.producto.trim();
  if (!producto || !form.proveedorId) return null;

  const proveedor = proveedores.find((p) => p.id === form.proveedorId);
  if (!proveedor) return null;

  return {
    fecha: form.fecha,
    proveedorId: proveedor.id,
    proveedorNombre: proveedor.nombre,
    producto,
    cantidad: fmtQty(parseFloat(form.cantidad) || 0),
    unidad: form.unidad.trim() || "kg",
    coste: fmtQty(parseFloat(form.coste) || 0),
    estado: form.estado,
  };
}
