import { Pedido } from "@/lib/types";

export const pedidos: Pedido[] = [
  { id: "P-1201", canal: "Mesa", estado: "entregado", total: 67.80, hora: "12:05", detalle: "Mesa 4 · Buffet x2" },
  { id: "P-1202", canal: "Uber Eats", estado: "entregado", total: 42.50, hora: "12:18", detalle: "California Roll + Gyozas" },
  { id: "P-1203", canal: "Glovo", estado: "entregado", total: 28.90, hora: "12:32" },
  { id: "P-1204", canal: "Mesa", estado: "entregado", total: 89.40, hora: "12:45", detalle: "Mesa 12 · Buffet x3" },
  { id: "P-1205", canal: "Just Eat", estado: "preparando", total: 35.60, hora: "13:02" },
  { id: "P-1206", canal: "Teléfono", estado: "preparando", total: 52.00, hora: "13:15", detalle: "Recogida 13:45" },
  { id: "P-1207", canal: "Uber Eats", estado: "preparando", total: 31.20, hora: "13:28" },
  { id: "P-1208", canal: "Mesa", estado: "listo", total: 45.90, hora: "13:35", detalle: "Mesa 7" },
  { id: "P-1209", canal: "Glovo", estado: "listo", total: 48.70, hora: "13:42" },
  { id: "P-1210", canal: "Mesa", estado: "pendiente", total: 38.50, hora: "13:50", detalle: "Mesa 3" },
  { id: "P-1211", canal: "Just Eat", estado: "pendiente", total: 29.80, hora: "13:55" },
  { id: "P-1212", canal: "Teléfono", estado: "pendiente", total: 64.00, hora: "14:02", detalle: "Delivery zona Ruzafa" },
];

export const pedidosStats = {
  total: pedidos.length,
  pendientes: pedidos.filter((p) => p.estado === "pendiente").length,
  enCurso: pedidos.filter((p) => p.estado === "preparando" || p.estado === "listo").length,
  entregados: pedidos.filter((p) => p.estado === "entregado").length,
  delivery: pedidos.filter((p) => p.canal !== "Mesa" && p.canal !== "Teléfono").length,
};
