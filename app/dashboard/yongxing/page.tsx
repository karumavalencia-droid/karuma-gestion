"use client";

import { SupplierCatalogPage } from "@/components/cominport/SupplierCatalogPage";
import {
  yongxingListaHabitual,
  yongxingProducts,
  yongxingStockAlerts,
} from "@/src/data/yongxingProducts";

/** Yongxing todavía no tiene facturas en el módulo de Facturas: sin ranking. */
const sinRankingDeFacturas = () => undefined;

export default function YongxingPage() {
  return (
    <SupplierCatalogPage
      supplierName="Yongxing 永兴"
      storagePrefix="yongxing"
      whatsappStorageKey="YONGXING_WHATSAPP"
      defaultEmail="manisesfood@gmail.com"
      products={yongxingProducts}
      stockAlerts={yongxingStockAlerts}
      defaultFavorites={yongxingListaHabitual}
      getInvoiceMeta={sinRankingDeFacturas}
    />
  );
}
