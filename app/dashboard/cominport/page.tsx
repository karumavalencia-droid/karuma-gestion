"use client";

import { SupplierCatalogPage } from "@/components/cominport/SupplierCatalogPage";
import {
  cominportProducts,
  cominportStockAlerts,
} from "@/src/data/cominportProducts";

export default function CominportPage() {
  return (
    <SupplierCatalogPage
      supplierName="Cominport"
      storagePrefix="cominport"
      whatsappStorageKey="COMINPORT_WHATSAPP"
      products={cominportProducts}
      stockAlerts={cominportStockAlerts}
    />
  );
}
