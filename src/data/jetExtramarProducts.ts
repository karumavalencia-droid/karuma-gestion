import type {
  CominportProduct,
  CominportStockAlert,
} from "@/src/data/cominportProducts";

/**
 * Selección inicial obtenida del catálogo público de Jet Extramar.
 * Los códigos corresponden a la referencia oficial publicada por el proveedor.
 */
export const jetExtramarProducts: CominportProduct[] = [
  {
    codigo: "734",
    nombre: "Carne de kebab de ternera loncheada",
    categoria: "Carnes congeladas",
    formato: "3 bolsas x 1 kg",
  },
  {
    codigo: "733",
    nombre: "Carne de kebab de pollo loncheada",
    categoria: "Carnes congeladas",
    formato: "3 bolsas x 1 kg",
  },
  {
    codigo: "732",
    nombre: "Pimientos del piquillo rellenos de atún",
    categoria: "Precocinados",
    formato: "1 lata x 860 g · 16 unidades",
  },
  {
    codigo: "738",
    nombre: "Tequeño de gouda",
    categoria: "Precocinados",
    formato: "2 bolsas x 40 unidades",
  },
  {
    codigo: "731",
    nombre: "Base de patata y cebolla",
    categoria: "Verduras congeladas",
    formato: "1 caja x 6 kg · 6 bolsas x 1 kg",
  },
  {
    codigo: "737",
    nombre: "Torrezno de Soria extra",
    categoria: "Platos preparados",
    formato: "Caja aprox. 7,2 kg · 4 bandejas",
  },
  {
    codigo: "727",
    nombre: "Delicioso mascarpone y café",
    categoria: "Postres congelados",
    formato: "5 cajas x 12 unidades x 120 ml",
  },
  {
    codigo: "724",
    nombre: "Delicioso de chocolate Dubái",
    categoria: "Postres congelados",
    formato: "5 cajas x 12 unidades x 120 ml",
  },
  {
    codigo: "721",
    nombre: "Pastel Cream Block de higo",
    categoria: "Postres congelados",
    formato: "4 estuches x 32 raciones · 110 ml",
  },
  {
    codigo: "719",
    nombre: "Pastel Cream Block de galleta Lotus",
    categoria: "Postres congelados",
    formato: "4 estuches x 32 raciones · 110 ml",
  },
];

/** Punto de entrada reservado para la futura integración con Inventario. */
export const jetExtramarStockAlerts: CominportStockAlert[] = [];
