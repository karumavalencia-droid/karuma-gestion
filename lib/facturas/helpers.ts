import { CategoriaFactura, Factura, FacturasStore } from "@/lib/types";

export const STORAGE_KEY = "karuma_facturas_v1";
export const MAX_FILE_BYTES = 2 * 1024 * 1024;

export const CATEGORIAS_FACTURA: CategoriaFactura[] = [
  "Factura",
  "Pescado",
  "Carne",
  "Verdura",
  "Arroz",
  "Bebidas",
  "Limpieza",
  "Packaging",
  "Otros",
];

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function fmtNum(value: number, decimals = 2): number {
  return parseFloat(value.toFixed(decimals));
}

function mesActual(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function createSeedFacturas(): Factura[] {
  const now = Date.now();
  return [
    {
      id: "fac-1",
      fecha: "2026-06-05",
      proveedor: "Pescados del Mediterráneo S.L.",
      importe: 1240.5,
      categoria: "Pescado",
      observaciones: "Salmón y atún semanal",
      archivoNombre: "",
      archivoTipo: "",
      archivoData: "",
      createdAt: now - 86400000,
    },
    {
      id: "fac-2",
      fecha: "2026-06-03",
      proveedor: "Arroces Valencia",
      importe: 385,
      categoria: "Arroz",
      observaciones: "Koshihikari 50 kg",
      archivoNombre: "",
      archivoTipo: "",
      archivoData: "",
      createdAt: now - 172800000,
    },
    {
      id: "fac-3",
      fecha: "2026-06-01",
      proveedor: "Distribuciones Orientales",
      importe: 290.8,
      categoria: "Packaging",
      observaciones: "Envases delivery y wasabi",
      archivoNombre: "",
      archivoTipo: "",
      archivoData: "",
      createdAt: now - 259200000,
    },
  ];
}

export function seedFacturas(): FacturasStore {
  return { facturas: createSeedFacturas() };
}

function normalizeFactura(raw: unknown): Factura | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const fecha = String(r.fecha ?? "").slice(0, 10);
  if (!fecha) return null;

  const categoria = String(r.categoria ?? "Otros");
  const categorias = CATEGORIAS_FACTURA as readonly string[];

  return {
    id: String(r.id ?? genId()),
    fecha,
    proveedor: String(r.proveedor ?? "").trim() || "Sin proveedor",
    importe: fmtNum(parseFloat(String(r.importe ?? 0)) || 0),
    categoria: categorias.includes(categoria) ? (categoria as CategoriaFactura) : "Otros",
    observaciones: String(r.observaciones ?? ""),
    archivoNombre: String(r.archivoNombre ?? ""),
    archivoTipo: String(r.archivoTipo ?? ""),
    archivoData: String(r.archivoData ?? ""),
    createdAt: typeof r.createdAt === "number" ? r.createdAt : Date.now(),
  };
}

export function loadFacturas(): FacturasStore {
  if (typeof window === "undefined") return seedFacturas();

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = seedFacturas();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const facturas = Array.isArray(parsed.facturas)
      ? parsed.facturas.map(normalizeFactura).filter((f): f is Factura => f !== null)
      : [];

    const store: FacturasStore = {
      facturas: facturas.length > 0 ? facturas : createSeedFacturas(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    return store;
  } catch {
    const seeded = seedFacturas();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

export function saveFacturas(store: FacturasStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function isPdf(tipo: string): boolean {
  return tipo === "application/pdf" || tipo.endsWith("/pdf");
}

export function isImage(tipo: string): boolean {
  return tipo.startsWith("image/");
}

export function readFileAsDataUrl(file: File): Promise<{ dataUrl: string; tipo: string; nombre: string }> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_FILE_BYTES) {
      reject(new Error(`Archivo demasiado grande (máx. ${MAX_FILE_BYTES / 1024 / 1024} MB)`));
      return;
    }

    const allowed = [
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];
    const tipo = file.type || "application/octet-stream";
    const ext = file.name.split(".").pop()?.toLowerCase();
    const ok =
      allowed.includes(tipo) ||
      ext === "pdf" ||
      ext === "jpg" ||
      ext === "jpeg" ||
      ext === "png";

    if (!ok) {
      reject(new Error("Formato no permitido. Usa PDF, JPG o PNG."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      let mime = tipo;
      if (ext === "pdf" && !mime.includes("pdf")) mime = "application/pdf";
      if ((ext === "jpg" || ext === "jpeg") && !mime.startsWith("image/")) mime = "image/jpeg";
      if (ext === "png" && !mime.startsWith("image/")) mime = "image/png";
      resolve({
        dataUrl: String(reader.result ?? ""),
        tipo: mime,
        nombre: file.name,
      });
    };
    reader.onerror = () => reject(new Error("Error al leer el archivo"));
    reader.readAsDataURL(file);
  });
}

export interface FacturasStats {
  totalMes: number;
  countMes: number;
  porProveedor: { proveedor: string; total: number; count: number }[];
  porCategoria: { categoria: CategoriaFactura; total: number; count: number }[];
}

export function computeStats(facturas: Factura[], mes = mesActual()): FacturasStats {
  const delMes = facturas.filter((f) => f.fecha.startsWith(mes));
  const totalMes = fmtNum(delMes.reduce((s, f) => s + f.importe, 0));

  const provMap = new Map<string, { total: number; count: number }>();
  const catMap = new Map<CategoriaFactura, { total: number; count: number }>();

  for (const f of facturas) {
    const p = provMap.get(f.proveedor) ?? { total: 0, count: 0 };
    p.total += f.importe;
    p.count += 1;
    provMap.set(f.proveedor, p);

    const c = catMap.get(f.categoria) ?? { total: 0, count: 0 };
    c.total += f.importe;
    c.count += 1;
    catMap.set(f.categoria, c);
  }

  const porProveedor = [...provMap.entries()]
    .map(([proveedor, v]) => ({ proveedor, total: fmtNum(v.total), count: v.count }))
    .sort((a, b) => b.total - a.total);

  const porCategoria = CATEGORIAS_FACTURA.map((categoria) => {
    const v = catMap.get(categoria) ?? { total: 0, count: 0 };
    return { categoria, total: fmtNum(v.total), count: v.count };
  }).filter((x) => x.count > 0);

  return {
    totalMes,
    countMes: delMes.length,
    porProveedor,
    porCategoria,
  };
}

export const EMPTY_FACTURA_FORM = {
  fecha: new Date().toISOString().slice(0, 10),
  proveedor: "",
  importe: "",
  categoria: "Otros" as CategoriaFactura,
  observaciones: "",
};

export type FacturaForm = typeof EMPTY_FACTURA_FORM;

export function facturaToForm(f: Factura): FacturaForm {
  return {
    fecha: f.fecha,
    proveedor: f.proveedor,
    importe: String(f.importe),
    categoria: f.categoria,
    observaciones: f.observaciones,
  };
}

export function parseFacturaForm(
  form: FacturaForm,
  archivo?: { nombre: string; tipo: string; data: string },
  existing?: Factura,
): Omit<Factura, "id" | "createdAt"> | null {
  const fecha = form.fecha.slice(0, 10);
  if (!fecha) return null;

  const proveedor = form.proveedor.trim();
  if (!proveedor) return null;

  const importe = fmtNum(parseFloat(form.importe) || 0);
  if (importe <= 0) return null;

  return {
    fecha,
    proveedor,
    importe,
    categoria: form.categoria,
    observaciones: form.observaciones.trim(),
    archivoNombre: archivo?.nombre ?? existing?.archivoNombre ?? "",
    archivoTipo: archivo?.tipo ?? existing?.archivoTipo ?? "",
    archivoData: archivo?.data ?? existing?.archivoData ?? "",
  };
}
