/**
 * Registro único de los proveedores con ficha propia en /compras/<slug>.
 *
 * El menú lateral, las tarjetas de /compras y la página de detalle resuelven
 * todos el mismo slug desde aquí, para que no vuelva a pasar que un enlace
 * apunte a una ruta que no existe (Kanyo/Kankyo era justo ese caso).
 */

import type { Proveedor } from "@/lib/types";

export type SupplierSlug = "jet-extramar" | "yongxing" | "kanyo" | "cominport";

export interface CoreSupplier {
  slug: SupplierSlug;
  /** Nombre corto: menú lateral, tarjetas y cabecera de la ficha. */
  nombre: string;
  /** Nombre en chino, cuando el proveedor lo usa. */
  nombreChino?: string;
  contacto: string;
  telefono: string;
  email: string;
  /** Solo dígitos, con prefijo de país. Vacío = no tenemos WhatsApp suyo. */
  whatsapp: string;
  categoria: string;
  /** false = todavía no hemos cargado su catálogo de productos. */
  tieneCatalogo: boolean;
}

/** Datos de contacto: los mismos que ya usan las páginas de catálogo. */
export const CORE_SUPPLIERS: readonly CoreSupplier[] = [
  {
    slug: "jet-extramar",
    nombre: "Jet Extramar",
    contacto: "",
    telefono: "",
    email: "",
    whatsapp: "",
    categoria: "Pescado",
    tieneCatalogo: true,
  },
  {
    slug: "yongxing",
    nombre: "Yongxing",
    nombreChino: "永兴食品",
    contacto: "Manises Food",
    telefono: "",
    email: "manisesfood@gmail.com",
    whatsapp: "",
    categoria: "Distribución",
    tieneCatalogo: true,
  },
  {
    slug: "kanyo",
    nombre: "Kanyo",
    nombreChino: "康有优品",
    contacto: "Kankyo Youpin",
    telefono: "+34 696 396 116",
    email: "kankyo-youpin@outlook.com",
    whatsapp: "34696396116",
    categoria: "Distribución",
    tieneCatalogo: true,
  },
  {
    slug: "cominport",
    nombre: "Cominport",
    contacto: "Catálogo de compras",
    telefono: "+34 699 503 780",
    email: "",
    whatsapp: "34699503780",
    categoria: "Distribución",
    tieneCatalogo: true,
  },
] as const;

/**
 * Nombres alternativos que hemos usado en algún sitio (base de datos, menú
 * antiguo, rutas /dashboard/*) y que deben llevar a la misma ficha.
 */
const SLUG_ALIASES: Record<string, SupplierSlug> = {
  "jet-extramar": "jet-extramar",
  "jet extramar": "jet-extramar",
  jetextramar: "jet-extramar",
  jet: "jet-extramar",
  yongxing: "yongxing",
  "永兴": "yongxing",
  "永兴食品": "yongxing",
  manisesfood: "yongxing",
  kanyo: "kanyo",
  // En producción el catálogo se llamó siempre "Kankyo": es el mismo proveedor.
  kankyo: "kanyo",
  "康有优品": "kanyo",
  cominport: "cominport",
};

/** Quita acentos, espacios de sobra y mayúsculas para poder comparar nombres. */
function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es");
}

/**
 * Resuelve un slug de URL o un nombre de proveedor al slug canónico.
 * Acepta "Kankyo", "Yongxing（永兴食品）", "jet extramar", etc.
 */
export function resolveSupplierSlug(input: string): SupplierSlug | null {
  const raw = normalize(input);
  if (!raw) return null;

  const direct = SLUG_ALIASES[raw];
  if (direct) return direct;

  // Nombres compuestos: "Yongxing（永兴食品）", "Kankyo Youpin", "Cominport SL".
  for (const [alias, slug] of Object.entries(SLUG_ALIASES)) {
    if (raw === alias) return slug;
    // Solo prefijos con separador, para que "jet" no capture "jetzz".
    if (raw.startsWith(`${alias} `) || raw.startsWith(`${alias}（`) || raw.startsWith(`${alias}(`)) {
      return slug;
    }
    if (alias.length >= 5 && raw.includes(alias)) return slug;
  }

  return null;
}

/** Ficha del proveedor a partir de un slug de URL o de un nombre. */
export function getSupplier(input: string): CoreSupplier | null {
  const slug = resolveSupplierSlug(input);
  if (!slug) return null;
  return CORE_SUPPLIERS.find((supplier) => supplier.slug === slug) ?? null;
}

/** Ruta de la ficha, o null si ese proveedor no tiene página propia. */
export function supplierDetailPath(nombre: string): string | null {
  const slug = resolveSupplierSlug(nombre);
  return slug ? `/compras/${slug}` : null;
}

/** Nombre completo para cabeceras: "Yongxing 永兴食品". */
export function supplierFullName(supplier: CoreSupplier): string {
  return supplier.nombreChino ? `${supplier.nombre} ${supplier.nombreChino}` : supplier.nombre;
}

/**
 * Deja siempre visibles los cuatro proveedores con ficha, y quita duplicados:
 * "Kanyo" y "Kankyo", o "Yongxing" y "Yongxing（永兴食品）", son el mismo y
 * antes salían como dos tarjetas distintas.
 */
export function withCoreSuppliers(proveedores: Proveedor[]): Proveedor[] {
  const porSlug = new Map<SupplierSlug, Proveedor>();
  const resto: Proveedor[] = [];

  for (const proveedor of proveedores) {
    const slug = resolveSupplierSlug(proveedor.nombre);
    if (!slug) {
      resto.push(proveedor);
      continue;
    }
    if (!porSlug.has(slug)) porSlug.set(slug, proveedor);
  }

  const principales: Proveedor[] = CORE_SUPPLIERS.map((core) => {
    const guardado = porSlug.get(core.slug);
    return {
      id: guardado?.id ?? `core-${core.slug}`,
      nombre: guardado?.nombre || core.nombre,
      contacto: guardado?.contacto || core.contacto,
      telefono: guardado?.telefono || core.telefono,
      email: guardado?.email || core.email,
      categoria: guardado?.categoria || core.categoria,
      estado: guardado?.estado ?? "activo",
    };
  });

  return [...principales, ...resto];
}
