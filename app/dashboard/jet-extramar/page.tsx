"use client";

import { SupplierCatalogPage } from "@/components/cominport/SupplierCatalogPage";
import {
  jetExtramarProducts,
  jetExtramarStockAlerts,
} from "@/src/data/jetExtramarProducts";

export default function JetExtramarPage() {
  return (
    <SupplierCatalogPage
      supplierName="Jet Extramar"
      storagePrefix="jet_extramar"
      whatsappStorageKey="JET_EXTRAMAR_WHATSAPP"
      products={jetExtramarProducts}
      stockAlerts={jetExtramarStockAlerts}
    />
  );
}
