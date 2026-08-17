import { ComprasPanel } from "@/components/compras/ComprasPanel";

export default async function ComprasPage({
  searchParams,
}: {
  searchParams: Promise<{ proveedor?: string | string[] }>;
}) {
  const params = await searchParams;
  const proveedor = Array.isArray(params.proveedor) ? params.proveedor[0] : params.proveedor;
  return <ComprasPanel initialSearch={proveedor ?? ""} />;
}
