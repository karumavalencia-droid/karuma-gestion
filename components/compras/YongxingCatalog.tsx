"use client";

import { SupplierCatalogPage } from "@/components/cominport/SupplierCatalogPage";
import {
  yongxingListaHabitual,
  yongxingProducts,
  yongxingStockAlerts,
} from "@/src/data/yongxingProducts";

export default function YongxingCatalog() {
  return (
    <SupplierCatalogPage
      supplierName="Yongxing 永兴食品"
      storagePrefix="yongxing"
      whatsappStorageKey="YONGXING_WHATSAPP"
      defaultWhatsappNumber="34963141366"
      products={yongxingProducts}
      stockAlerts={yongxingStockAlerts}
      defaultFavorites={yongxingListaHabitual}
    />
  );
}
