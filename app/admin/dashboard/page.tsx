import Link from "next/link";
import { ExecutiveDashboard } from "@/app/components/ExecutiveDashboard";

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Karuma ERP - Control de Proveedores</h1>
          <p className="text-gray-600">
            Dashboard en tiempo real de gastos, alertas y oportunidades de ahorro
          </p>
        </div>

        <div className="space-y-6">
          <ExecutiveDashboard />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Link
              href="/admin/suppliers"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition border-l-4 border-blue-600"
            >
              <h3 className="font-bold mb-2">📦 Gestión de Proveedores</h3>
              <p className="text-sm text-gray-600">CRUD de proveedores y productos</p>
            </Link>

            <Link
              href="/admin/suppliers/analytics"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition border-l-4 border-green-600"
            >
              <h3 className="font-bold mb-2">📊 Analytics Avanzado</h3>
              <p className="text-sm text-gray-600">Análisis, pronósticos y benchmarking</p>
            </Link>

            <Link
              href="/admin/suppliers/notifications"
              className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition border-l-4 border-orange-600"
            >
              <h3 className="font-bold mb-2">🔔 Centro de Notificaciones</h3>
              <p className="text-sm text-gray-600">Alertas y recomendaciones inteligentes</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
