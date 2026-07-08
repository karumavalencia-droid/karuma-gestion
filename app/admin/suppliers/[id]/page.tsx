"use client";

import { useParams } from "next/navigation";
import { SupplierProductsManager } from "@/app/components/SupplierProductsManager";

export default function SupplierDetailPage() {
  const params = useParams();
  const supplierId = parseInt(params.id as string);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <a
            href="/admin/suppliers"
            className="text-blue-600 hover:underline mb-4 inline-block"
          >
            ← Volver a proveedores
          </a>
          <h1 className="text-4xl font-bold mb-2">Productos del Proveedor</h1>
          <p className="text-gray-600">
            Gestión de productos para ID {supplierId}
          </p>
        </div>

        <SupplierProductsManager supplierId={supplierId} />
      </div>
    </div>
  );
}
