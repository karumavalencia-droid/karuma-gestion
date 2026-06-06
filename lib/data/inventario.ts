import { ItemInventario } from "@/lib/types";

export const inventario: ItemInventario[] = [
  { id: "1", producto: "Arroz sushi (Koshihikari)", categoria: "Secos", stockActual: 45, unidad: "kg", stockMinimo: 20, estado: "correcto" },
  { id: "2", producto: "Salmón fresco", categoria: "Pescado", stockActual: 8, unidad: "kg", stockMinimo: 10, estado: "bajo" },
  { id: "3", producto: "Atún rojo", categoria: "Pescado", stockActual: 3, unidad: "kg", stockMinimo: 8, estado: "critico" },
  { id: "4", producto: "Pollo teriyaki", categoria: "Carnes", stockActual: 12, unidad: "kg", stockMinimo: 8, estado: "correcto" },
  { id: "5", producto: "Sepia", categoria: "Marisco", stockActual: 4, unidad: "kg", stockMinimo: 5, estado: "bajo" },
  { id: "6", producto: "Gambas peladas", categoria: "Marisco", stockActual: 6, unidad: "kg", stockMinimo: 4, estado: "correcto" },
  { id: "7", producto: "Alga nori", categoria: "Secos", stockActual: 120, unidad: "hojas", stockMinimo: 80, estado: "correcto" },
  { id: "8", producto: "Wasabi", categoria: "Condimentos", stockActual: 2, unidad: "kg", stockMinimo: 1, estado: "correcto" },
  { id: "9", producto: "Salsa de soja", categoria: "Condimentos", stockActual: 8, unidad: "L", stockMinimo: 5, estado: "correcto" },
  { id: "10", producto: "Vinagre de arroz", categoria: "Condimentos", stockActual: 3, unidad: "L", stockMinimo: 4, estado: "bajo" },
  { id: "11", producto: "Sésamo tostado", categoria: "Secos", stockActual: 1.5, unidad: "kg", stockMinimo: 2, estado: "bajo" },
  { id: "12", producto: "Aguacate", categoria: "Verduras", stockActual: 15, unidad: "uds", stockMinimo: 20, estado: "bajo" },
  { id: "13", producto: "Philadelphia", categoria: "Lácteos", stockActual: 4, unidad: "kg", stockMinimo: 3, estado: "correcto" },
  { id: "14", producto: "Harina tempura", categoria: "Secos", stockActual: 10, unidad: "kg", stockMinimo: 5, estado: "correcto" },
  { id: "15", producto: "Aceite de freír", categoria: "Secos", stockActual: 18, unidad: "L", stockMinimo: 10, estado: "correcto" },
];

export function getAlertasInventario() {
  return inventario
    .filter((item) => item.estado === "bajo" || item.estado === "critico")
    .map((item) => ({
      producto: item.producto,
      stockActual: item.stockActual,
      stockMinimo: item.stockMinimo,
      nivel: item.estado === "critico" ? ("critico" as const) : ("bajo" as const),
    }));
}
