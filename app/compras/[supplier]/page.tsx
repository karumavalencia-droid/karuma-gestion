import { notFound } from "next/navigation";
import { ComprasPanel } from "@/components/compras/ComprasPanel";
import YongxingCatalog from "@/components/compras/YongxingCatalog";

const SUPPLIER_NAMES: Record<string, string> = {
  kanyo: "Kanyo",
  yongxing: "Yongxing",
};

export default async function SupplierPurchasesPage({
  params,
}: {
  params: Promise<{ supplier: string }>;
}) {
  const { supplier } = await params;
  const supplierName = SUPPLIER_NAMES[supplier.toLowerCase()];
  if (!supplierName) notFound();

  if (supplier.toLowerCase() === "yongxing") return <YongxingCatalog />;

  return <ComprasPanel initialSearch={supplierName} />;
}
