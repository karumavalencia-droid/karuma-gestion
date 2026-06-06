import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { StatCard } from "@/components/ui/StatCard";
import { compras } from "@/lib/data/compras";
import { Compra } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { ShoppingCart, Euro, Truck } from "lucide-react";

export default function ComprasPage() {
  const totalImporte = compras.reduce((sum, c) => sum + c.importe, 0);
  const proveedores = [...new Set(compras.map((c) => c.proveedor))];

  return (
    <div>
      <PageHeader
        title="Compras"
        description="Registro de compras a proveedores"
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total compras (mes)"
          value={formatCurrency(totalImporte)}
          icon={Euro}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Pedidos registrados"
          value={String(compras.length)}
          icon={ShoppingCart}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Proveedores"
          value={String(proveedores.length)}
          icon={Truck}
          iconColor="bg-purple-50 text-purple-600"
        />
      </div>

      <DataTable<Compra>
        data={compras}
        keyExtractor={(c) => c.id}
        columns={[
          { key: "proveedor", header: "Proveedor" },
          { key: "producto", header: "Producto" },
          {
            key: "cantidad",
            header: "Cantidad",
            render: (c) => `${c.cantidad} ${c.unidad}`,
          },
          {
            key: "importe",
            header: "Importe",
            render: (c) => (
              <span className="font-medium text-gray-900">{formatCurrency(c.importe)}</span>
            ),
          },
          {
            key: "fecha",
            header: "Fecha",
            render: (c) => formatDate(c.fecha),
          },
        ]}
      />
    </div>
  );
}
