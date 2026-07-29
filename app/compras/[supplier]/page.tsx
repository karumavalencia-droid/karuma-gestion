import { notFound, redirect } from "next/navigation";
import { SupplierDetail } from "@/components/compras/SupplierDetail";
import {
  CORE_SUPPLIERS,
  getSupplier,
  resolveSupplierSlug,
  supplierFullName,
} from "@/lib/compras/suppliers";

export function generateStaticParams() {
  return CORE_SUPPLIERS.map((supplier) => ({ supplier: supplier.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ supplier: string }>;
}) {
  const { supplier } = await params;
  const found = getSupplier(supplier);
  return { title: found ? `${supplierFullName(found)} · Compras` : "Proveedor" };
}

export default async function SupplierDetailPage({
  params,
}: {
  params: Promise<{ supplier: string }>;
}) {
  const { supplier } = await params;
  const slug = resolveSupplierSlug(supplier);
  if (!slug) notFound();

  // /compras/kankyo y demás alias caen en la ficha canónica.
  if (slug !== supplier) redirect(`/compras/${slug}`);

  const found = getSupplier(slug);
  if (!found) notFound();

  return <SupplierDetail supplier={found} />;
}
