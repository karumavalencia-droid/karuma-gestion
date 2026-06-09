export const STORAGE_KEY = "karuma_ingredients_v2";

export interface Ingredient {
  id: string;
  nombre: string;
  nombreZh?: string;
  categoria: string;
  categoriaZh?: string;
  unidad: string;
  precio: number;
  proveedor: string;
  updatedAt: string;
}

export interface IngredientsStore {
  ingredientes: Ingredient[];
}

export function genId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function fmtPrecio(value: number): number {
  return parseFloat(value.toFixed(2));
}

function seedIngredientes(): Ingredient[] {
  const now = "2026-06-07T10:00:00.000Z";
  return [
    {
      id: "ing-1",
      nombre: "Salmón",
      nombreZh: "三文鱼",
      categoria: "Marisco",
      categoriaZh: "海鲜",
      unidad: "kg",
      precio: 22,
      proveedor: "Makro",
      updatedAt: now,
    },
    {
      id: "ing-2",
      nombre: "Arroz sushi",
      nombreZh: "寿司米",
      categoria: "Arroz y pasta",
      categoriaZh: "米面",
      unidad: "kg",
      precio: 1.8,
      proveedor: "Transgourmet",
      updatedAt: "2026-06-06T14:30:00.000Z",
    },
    {
      id: "ing-3",
      nombre: "Alitas de pollo",
      nombreZh: "鸡翅",
      categoria: "Carne",
      categoriaZh: "肉类",
      unidad: "kg",
      precio: 4.2,
      proveedor: "Pollos Planes",
      updatedAt: "2026-06-05T09:15:00.000Z",
    },
    {
      id: "ing-4",
      nombre: "Ternera",
      nombreZh: "牛肉",
      categoria: "Carne",
      categoriaZh: "肉类",
      unidad: "kg",
      precio: 15,
      proveedor: "Makro",
      updatedAt: "2026-06-04T16:45:00.000Z",
    },
    {
      id: "ing-5",
      nombre: "Gambas",
      nombreZh: "虾",
      categoria: "Marisco",
      categoriaZh: "海鲜",
      unidad: "kg",
      precio: 9.5,
      proveedor: "Transgourmet",
      updatedAt: "2026-06-03T11:20:00.000Z",
    },
  ];
}

export function seedIngredients(): IngredientsStore {
  return { ingredientes: seedIngredientes() };
}

function normalizeIngredient(raw: unknown): Ingredient | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const nombre = String(r.nombre ?? "").trim();
  if (!nombre) return null;

  return {
    id: String(r.id ?? genId()),
    nombre,
    nombreZh: r.nombreZh ? String(r.nombreZh) : undefined,
    categoria: String(r.categoria ?? "Otros").trim() || "Otros",
    categoriaZh: r.categoriaZh ? String(r.categoriaZh) : undefined,
    unidad: String(r.unidad ?? "kg").trim() || "kg",
    precio: fmtPrecio(parseFloat(String(r.precio ?? 0)) || 0),
    proveedor: String(r.proveedor ?? "").trim() || "—",
    updatedAt: String(r.updatedAt ?? new Date().toISOString()),
  };
}

function readStorage(): IngredientsStore | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const ingredientes = Array.isArray(parsed.ingredientes)
      ? parsed.ingredientes
          .map(normalizeIngredient)
          .filter((i): i is Ingredient => i !== null)
      : [];

    if (ingredientes.length === 0) return null;

    return { ingredientes };
  } catch {
    return null;
  }
}

/** Datos mock — siempre disponibles sin red ni backend */
export function loadIngredients(): IngredientsStore {
  const stored = readStorage();
  if (stored) return stored;

  const seeded = seedIngredients();
  saveIngredients(seeded);
  return seeded;
}

export function saveIngredients(store: IngredientsStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* ignorar — la UI sigue con estado en memoria */
  }
}

export function displayName(ing: Ingredient, locale: "es" | "zh"): string {
  if (locale === "zh" && ing.nombreZh) return ing.nombreZh;
  return ing.nombre;
}

export function displayCategory(ing: Ingredient, locale: "es" | "zh"): string {
  if (locale === "zh" && ing.categoriaZh) return ing.categoriaZh;
  return ing.categoria;
}

export function formatUpdatedAt(iso: string, locale: "es" | "zh"): string {
  return new Intl.DateTimeFormat(locale === "zh" ? "zh-CN" : "es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export const EMPTY_INGREDIENT_FORM = {
  nombre: "",
  nombreZh: "",
  categoria: "",
  categoriaZh: "",
  unidad: "kg",
  precio: "",
  proveedor: "",
};

export type IngredientForm = typeof EMPTY_INGREDIENT_FORM;

export function ingredientToForm(ing: Ingredient): IngredientForm {
  return {
    nombre: ing.nombre,
    nombreZh: ing.nombreZh ?? "",
    categoria: ing.categoria,
    categoriaZh: ing.categoriaZh ?? "",
    unidad: ing.unidad,
    precio: String(ing.precio),
    proveedor: ing.proveedor,
  };
}

export function parseIngredientForm(form: IngredientForm): Omit<Ingredient, "id" | "updatedAt"> | null {
  const nombre = form.nombre.trim();
  if (!nombre) return null;

  const precio = fmtPrecio(parseFloat(form.precio) || 0);
  if (precio <= 0) return null;

  return {
    nombre,
    nombreZh: form.nombreZh.trim() || undefined,
    categoria: form.categoria.trim() || "Otros",
    categoriaZh: form.categoriaZh.trim() || undefined,
    unidad: form.unidad.trim() || "kg",
    precio,
    proveedor: form.proveedor.trim() || "—",
  };
}
