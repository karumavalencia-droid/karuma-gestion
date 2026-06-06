import { ProductoVendido, AlertaImportante } from "@/lib/types";

export const dashboardStats = {
  ventasHoy: 2847.6,
  ventasMes: 68420.35,
  clientesHoy: 142,
  ticketMedio: 20.05,
  pedidosDelivery: 32,
  uberEats: { pedidos: 18, ventas: 892.4 },
  glovo: { pedidos: 14, ventas: 624.3 },
};

export const productosMasVendidos: ProductoVendido[] = [
  { nombre: "Buffet Mediodía (L-V)", cantidad: 68, ingresos: 1152.6 },
  { nombre: "California Roll (8 uds)", cantidad: 45, ingresos: 306.0 },
  { nombre: "Nigiri Salmón (2 uds)", cantidad: 38, ingresos: 171.0 },
  { nombre: "Tempura de Gambas", cantidad: 32, ingresos: 252.8 },
  { nombre: "Pollo Teriyaki", cantidad: 28, ingresos: 249.2 },
];

export const alertasImportantes: AlertaImportante[] = [
  {
    id: "1",
    tipo: "inventario",
    mensaje: "Atún rojo en stock crítico (3 kg / mín. 8 kg)",
    prioridad: "alta",
  },
  {
    id: "2",
    tipo: "inventario",
    mensaje: "Salmón fresco por debajo del mínimo",
    prioridad: "alta",
  },
  {
    id: "3",
    tipo: "pedido",
    mensaje: "4 pedidos delivery pendientes de preparar",
    prioridad: "media",
  },
  {
    id: "4",
    tipo: "personal",
    mensaje: "Laura Méndez de vacaciones — turno sala cubierto",
    prioridad: "media",
  },
  {
    id: "5",
    tipo: "finanzas",
    mensaje: "Comisiones delivery del mes: 3.421 €",
    prioridad: "media",
  },
];
