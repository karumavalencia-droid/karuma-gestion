"use client";

import { SupplierCatalogPage } from "@/components/cominport/SupplierCatalogPage";
import {
  cominportProducts,
  cominportStockAlerts,
} from "@/src/data/cominportProducts";
import { rankCominportProducts } from "@/src/data/cominportInvoiceRanking";

export default function CominportPage() {
  return (
    <SupplierCatalogPage
      supplierName="Cominport"
      storagePrefix="cominport"
      whatsappStorageKey="COMINPORT_WHATSAPP"
      defaultWhatsappNumber="34669503780"
      products={rankCominportProducts(cominportProducts)}
      stockAlerts={cominportStockAlerts}
    />
  );
}
