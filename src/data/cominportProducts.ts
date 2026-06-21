export interface CominportProduct {
  codigo: string;
  nombre: string;
  categoria: string;
  formato: string;
}

export interface CominportCartItem extends CominportProduct {
  cantidad: number;
}

export type CominportOrderStatus = "enviado_whatsapp";

export interface CominportOrder {
  id: string;
  fecha: string;
  productos: CominportCartItem[];
  cantidadTotal: number;
  estado: CominportOrderStatus;
  observaciones: string;
}

/**
 * Contrato reservado para Inventario.
 * El adaptador futuro podrá poblar esta lista sin cambiar la UI de Cominport.
 */
export interface CominportStockAlert {
  codigo: string;
  stockActual: number;
  stockMinimo: number;
  mensaje: "Producto próximo a agotarse";
}

export const cominportStockAlerts: CominportStockAlert[] = [];

/**
 * Catálogo local inicial. Se mantiene aislado para poder sustituirlo por la
 * exportación oficial de Cominport sin modificar la página ni sus componentes.
 */
export const cominportProducts: CominportProduct[] = [
  {
    codigo: "COM-001",
    nombre: "Arroz para sushi",
    categoria: "Arroz y harinas",
    formato: "Saco 20 kg",
  },
  {
    codigo: "COM-002",
    nombre: "Harina tempura",
    categoria: "Arroz y harinas",
    formato: "Caja 10 x 1 kg",
  },
  {
    codigo: "COM-003",
    nombre: "Panko japonés",
    categoria: "Arroz y harinas",
    formato: "Caja 10 x 1 kg",
  },
  {
    codigo: "COM-004",
    nombre: "Salsa de soja",
    categoria: "Salsas",
    formato: "Caja 6 x 1 L",
  },
  {
    codigo: "COM-005",
    nombre: "Salsa teriyaki",
    categoria: "Salsas",
    formato: "Caja 6 x 1,8 L",
  },
  {
    codigo: "COM-006",
    nombre: "Mayonesa japonesa",
    categoria: "Salsas",
    formato: "Caja 12 x 500 ml",
  },
  {
    codigo: "COM-007",
    nombre: "Salsa sweet chili",
    categoria: "Salsas",
    formato: "Caja 12 x 700 ml",
  },
  {
    codigo: "COM-008",
    nombre: "Vinagre de arroz",
    categoria: "Condimentos",
    formato: "Garrafa 20 L",
  },
  {
    codigo: "COM-009",
    nombre: "Mirin",
    categoria: "Condimentos",
    formato: "Garrafa 18 L",
  },
  {
    codigo: "COM-010",
    nombre: "Wasabi en polvo",
    categoria: "Condimentos",
    formato: "Caja 10 x 1 kg",
  },
  {
    codigo: "COM-011",
    nombre: "Jengibre rosa",
    categoria: "Condimentos",
    formato: "Caja 10 x 1,5 kg",
  },
  {
    codigo: "COM-012",
    nombre: "Alga nori",
    categoria: "Algas",
    formato: "Caja 10 x 100 hojas",
  },
  {
    codigo: "COM-013",
    nombre: "Alga wakame",
    categoria: "Algas",
    formato: "Caja 10 x 1 kg",
  },
  {
    codigo: "COM-014",
    nombre: "Edamame",
    categoria: "Congelados",
    formato: "Caja 20 x 500 g",
  },
  {
    codigo: "COM-015",
    nombre: "Gyoza de pollo",
    categoria: "Congelados",
    formato: "Caja 10 x 600 g",
  },
  {
    codigo: "COM-016",
    nombre: "Gyoza de verduras",
    categoria: "Congelados",
    formato: "Caja 10 x 600 g",
  },
  {
    codigo: "COM-017",
    nombre: "Mochi variado",
    categoria: "Postres",
    formato: "Caja 6 x 12 unidades",
  },
  {
    codigo: "COM-018",
    nombre: "Palillos de bambú",
    categoria: "Consumibles",
    formato: "Caja 30 x 100 pares",
  },
];
