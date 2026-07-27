"use client";

import { SupplierCatalogPage } from "@/components/cominport/SupplierCatalogPage";
import { kankyoProducts, kankyoStockAlerts } from "@/src/data/kankyoProducts";
import {
  getKankyoInvoiceMeta,
  rankKankyoProducts,
} from "@/src/data/kankyoInvoiceRanking";

export default function KankyoPage() {
  return (
    <SupplierCatalogPage
      supplierName="Kankyo"
      storagePrefix="kankyo"
      whatsappStorageKey="KANKYO_WHATSAPP"
      defaultWhatsappNumber="34696396116"
      defaultEmail="kankyo-youpin@outlook.com"
      products={rankKankyoProducts(kankyoProducts)}
      stockAlerts={kankyoStockAlerts}
      getInvoiceMeta={getKankyoInvoiceMeta}
    />
  );
}
