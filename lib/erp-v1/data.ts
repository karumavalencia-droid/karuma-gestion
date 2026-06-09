export const dashboardKpis = {
  ventasHoy: 3248.5,
  ventasAyer: 2891.2,
  ventasMes: 71734.55,
  clientes: 168,
  ticketMedio: 19.34,
  uberEats: 1245.8,
  glovo: 892.4,
  restosuite: 3068,
};

export const salesKpis = {
  today: 3248.5,
  yesterday: 2891.2,
  month: 71734.55,
  uberEats: 1245.8,
  glovo: 892.4,
  restosuite: 1104.3,
  cash: 856.2,
  card: 2392.3,
};

export interface WeeklyTrendRow {
  fecha: string;
  ventas: number;
  clientes: number;
  delivery: number;
}

export const weeklyTrend: WeeklyTrendRow[] = [
  { fecha: "2026-06-01", ventas: 2890.4, clientes: 142, delivery: 28 },
  { fecha: "2026-06-02", ventas: 3124.8, clientes: 156, delivery: 31 },
  { fecha: "2026-06-03", ventas: 2756.2, clientes: 138, delivery: 24 },
  { fecha: "2026-06-04", ventas: 3412.6, clientes: 171, delivery: 35 },
  { fecha: "2026-06-05", ventas: 3589.1, clientes: 178, delivery: 38 },
  { fecha: "2026-06-06", ventas: 4021.5, clientes: 195, delivery: 42 },
  { fecha: "2026-06-07", ventas: 3248.5, clientes: 168, delivery: 32 },
];

export interface DishRecipeLine {
  nombre: string;
  nombreZh?: string;
  cantidad: string;
}

export interface FoodCostDish {
  id: string;
  nombre: string;
  categoria: string;
  precio: number;
  coste: number;
  receta: DishRecipeLine[];
}

export const foodCostDishes: FoodCostDish[] = [
  {
    id: "1",
    nombre: "Salmón Nigiri",
    categoria: "Sushi",
    precio: 4.5,
    coste: 0.3,
    receta: [
      { nombre: "Salmón", nombreZh: "三文鱼", cantidad: "12g" },
      { nombre: "Arroz sushi", nombreZh: "寿司米", cantidad: "18g" },
    ],
  },
  {
    id: "2",
    nombre: "Pollo Teriyaki",
    categoria: "Plato",
    precio: 12.9,
    coste: 3.87,
    receta: [
      { nombre: "Alitas de pollo", nombreZh: "鸡翅", cantidad: "180g" },
      { nombre: "Arroz sushi", nombreZh: "寿司米", cantidad: "150g" },
    ],
  },
  {
    id: "3",
    nombre: "Gambón Plancha",
    categoria: "Plato",
    precio: 14.5,
    coste: 4.35,
    receta: [
      { nombre: "Gambas", nombreZh: "虾", cantidad: "200g" },
      { nombre: "Arroz sushi", nombreZh: "寿司米", cantidad: "120g" },
    ],
  },
  {
    id: "4",
    nombre: "Sepia Grill",
    categoria: "Plato",
    precio: 13.8,
    coste: 4.14,
    receta: [
      { nombre: "Sepia", nombreZh: "墨鱼", cantidad: "220g" },
      { nombre: "Arroz sushi", nombreZh: "寿司米", cantidad: "100g" },
    ],
  },
];

export type InvoiceStatus = "pending" | "paid" | "review";

export interface InvoiceRecord {
  id: string;
  proveedor: string;
  fecha: string;
  importe: number;
  iva: number;
  estado: InvoiceStatus;
  archivo?: string;
}

export const invoiceSamples: InvoiceRecord[] = [
  {
    id: "inv-1",
    proveedor: "Pescados del Mediterráneo",
    fecha: "2026-06-05",
    importe: 1240.5,
    iva: 260.51,
    estado: "paid",
  },
  {
    id: "inv-2",
    proveedor: "Arroces Valencia",
    fecha: "2026-06-03",
    importe: 385.0,
    iva: 80.85,
    estado: "pending",
  },
];

export interface RecipeItem {
  id: string;
  nombre: string;
  categoria: string;
  pasosRational: string;
  pasosFritura: string;
  notas: string;
}

export const recipeSamples: RecipeItem[] = [
  {
    id: "r1",
    nombre: "Salmón Nigiri",
    categoria: "Sushi",
    pasosRational: "Vapor 3 min · 85°C · bandeja 1",
    pasosFritura: "—",
    notas: "Corte 25g · wasabi al servir",
  },
  {
    id: "r2",
    nombre: "Pollo Teriyaki",
    categoria: "Plato",
    pasosRational: "Horno 12 min · 180°C · vapor bajo",
    pasosFritura: "—",
    notas: "Marinar 30 min antes",
  },
  {
    id: "r3",
    nombre: "Tempura Gambón",
    categoria: "Fritura",
    pasosRational: "—",
    pasosFritura: "180°C · 2:30 min · aceite limpio",
    notas: "Masa fría · no amontonar",
  },
  {
    id: "r4",
    nombre: "Sepia Grill",
    categoria: "Plato",
    pasosRational: "Plancha 4 min · 220°C",
    pasosFritura: "—",
    notas: "Marcar y reposar 1 min",
  },
];

export interface PurchaseRow {
  id: string;
  proveedor: string;
  producto: string;
  cantidad: string;
  importe: number;
  fecha: string;
  estado: "pendiente" | "recibido";
}

export const purchaseSamples: PurchaseRow[] = [
  {
    id: "p1",
    proveedor: "Pescados del Mediterráneo",
    producto: "Salmón fresco",
    cantidad: "12 kg",
    importe: 312.0,
    fecha: "2026-06-06",
    estado: "pendiente",
  },
  {
    id: "p2",
    proveedor: "Verduras Ruzafa",
    producto: "Aguacate",
    cantidad: "24 uds",
    importe: 48.5,
    fecha: "2026-06-05",
    estado: "recibido",
  },
  {
    id: "p3",
    proveedor: "Arroces Valencia",
    producto: "Arroz Koshihikari",
    cantidad: "50 kg",
    importe: 385.0,
    fecha: "2026-06-03",
    estado: "recibido",
  },
];

export interface InventoryRow {
  id: string;
  producto: string;
  categoria: string;
  stock: number;
  unidad: string;
  minimo: number;
  estado: "ok" | "bajo" | "critico";
}

export const inventorySamples: InventoryRow[] = [
  {
    id: "i1",
    producto: "Salmón fresco",
    categoria: "Pescado",
    stock: 8.5,
    unidad: "kg",
    minimo: 10,
    estado: "bajo",
  },
  {
    id: "i2",
    producto: "Atún rojo",
    categoria: "Pescado",
    stock: 3.0,
    unidad: "kg",
    minimo: 8,
    estado: "critico",
  },
  {
    id: "i3",
    producto: "Arroz sushi",
    categoria: "Arroz",
    stock: 45,
    unidad: "kg",
    minimo: 20,
    estado: "ok",
  },
  {
    id: "i4",
    producto: "Aguacate",
    categoria: "Verdura",
    stock: 18,
    unidad: "uds",
    minimo: 15,
    estado: "ok",
  },
];

export function marginPct(precio: number, coste: number): number {
  if (precio <= 0) return 0;
  return parseFloat((((precio - coste) / precio) * 100).toFixed(1));
}
