import { redirect } from "next/navigation";
import { ComprasPanel } from "@/components/compras/ComprasPanel";
import { resolveSupplierSlug } from "@/lib/compras/suppliers";

export default async function ComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ proveedor?: string | string[] }>;
}) {
  const params = await searchParams;
  const proveedor = Array.isArray(params.proveedor) ? params.proveedor[0] : params.proveedor;

  // /compras?proveedor=Yongxing venía de la búsqueda antigua: si ese proveedor
  // tiene ficha, se abre la ficha en vez de dejar la lista filtrada.
  const slug = proveedor ? resolveSupplierSlug(proveedor) : null;
  if (slug) redirect(`/compras/${slug}`);

  return <ComprasPanel />;
}
