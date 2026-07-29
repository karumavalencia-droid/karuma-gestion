"use client";

import { SupplierCatalogPage } from "@/components/cominport/SupplierCatalogPage";
import { kankyoProducts, kankyoStockAlerts } from "@/src/data/kankyoProducts";
import {
  getKankyoInvoiceMeta,
  rankKankyoProducts,
} from "@/src/data/kankyoInvoiceRanking";

/** Kanyo = Kankyo: mismo proveedor, el catálogo se cargó con el nombre antiguo. */
export default function KanyoCatalog() {
  return (
    <SupplierCatalogPage
      supplierName="Kanyo"
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
