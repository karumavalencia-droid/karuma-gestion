import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { productos } from "@/lib/data/productos";
import { Producto } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const categorias = [...new Set(productos.map((p) => p.categoria))];

export default function ProductosPage() {
  const activos = productos.filter((p) => p.estado === "activo").length;

  return (
    <div>
      <PageHeader
        title="Productos"
        description={`${productos.length} productos · ${activos} activos · ${categorias.length} categorías`}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {categorias.map((cat) => (
          <span
            key={cat}
            className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600"
          >
            {cat} ({productos.filter((p) => p.categoria === cat).length})
          </span>
        ))}
      </div>

      <DataTable<Producto>
        data={productos}
        keyExtractor={(p) => p.id}
        columns={[
          { key: "nombre", header: "Producto" },
          { key: "categoria", header: "Categoría" },
          {
            key: "precio",
            header: "Precio",
            render: (p) => (
              <span className="font-medium text-gray-900">{formatCurrency(p.precio)}</span>
            ),
          },
          {
            key: "estado",
            header: "Estado",
            render: (p) => (
              <Badge variant={p.estado === "activo" ? "success" : "neutral"}>
                {p.estado === "activo" ? "Activo" : "Inactivo"}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
}
