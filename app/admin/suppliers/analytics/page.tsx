import { SupplierSpendingReport } from "@/app/components/SupplierSpendingReport";

export default function SupplierAnalyticsPage() {
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
          <h1 className="text-4xl font-bold mb-2">Analytics & Reportes</h1>
          <p className="text-gray-600">
            Análisis de gastos, precios y tendencias por proveedor
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <SupplierSpendingReport supplierId={7331} />
        </div>
      </div>
    </div>
  );
}
