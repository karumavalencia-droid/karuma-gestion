import Link from "next/link";
import { SupplierSpendingReport } from "@/app/components/SupplierSpendingReport";
import { SupplierForecast } from "@/app/components/SupplierForecast";
import { SupplierBenchmark } from "@/app/components/SupplierBenchmark";
import { RecommendationsPanel } from "@/app/components/RecommendationsPanel";

export default function SupplierAnalyticsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href="/admin/suppliers"
            className="text-blue-600 hover:underline mb-4 inline-block"
          >
            ← Volver a proveedores
          </Link>
          <h1 className="text-4xl font-bold mb-2">Dashboard de Analytics Avanzado</h1>
          <p className="text-gray-600">
            Análisis de gastos, pronósticos, benchmarking y tendencias
          </p>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
              <h2 className="text-2xl font-bold mb-4">📊 Resumen de Gastos</h2>
              <SupplierSpendingReport supplierId={7331} />
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <RecommendationsPanel supplierId={7331} />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">🔮 Pronóstico de Gastos (3-12 meses)</h2>
            <SupplierForecast supplierId={7331} />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">📈 Benchmarking de Proveedores</h2>
            <SupplierBenchmark />
          </div>
        </div>
      </div>
    </div>
  );
}
