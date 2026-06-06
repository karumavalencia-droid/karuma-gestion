import { PedidoDelivery } from "@/lib/types";

export const pedidosDelivery: PedidoDelivery[] = [
  { id: "UE-1042", plataforma: "Uber Eats", hora: "12:15", importe: 42.80, estado: "entregado" },
  { id: "GL-0891", plataforma: "Glovo", hora: "12:32", importe: 28.50, estado: "entregado" },
  { id: "UE-1043", plataforma: "Uber Eats", hora: "13:05", importe: 56.20, estado: "entregado" },
  { id: "GL-0892", plataforma: "Glovo", hora: "13:18", importe: 35.90, estado: "entregado" },
  { id: "UE-1044", plataforma: "Uber Eats", hora: "13:45", importe: 31.40, estado: "entregado" },
  { id: "GL-0893", plataforma: "Glovo", hora: "14:02", importe: 48.70, estado: "en camino" },
  { id: "UE-1045", plataforma: "Uber Eats", hora: "14:20", importe: 22.60, estado: "preparando" },
  { id: "GL-0894", plataforma: "Glovo", hora: "14:35", importe: 39.80, estado: "preparando" },
  { id: "UE-1046", plataforma: "Uber Eats", hora: "14:48", importe: 67.30, estado: "preparando" },
  { id: "GL-0895", plataforma: "Glovo", hora: "15:00", importe: 26.40, estado: "preparando" },
];

export const deliveryStats = {
  uberEats: {
    pedidos: 18,
    ventas: 892.40,
    ticketMedio: 49.58,
  },
  glovo: {
    pedidos: 14,
    ventas: 624.30,
    ticketMedio: 44.59,
  },
  total: {
    pedidos: 32,
    ventas: 1516.70,
    ticketMedio: 47.40,
  },
};
