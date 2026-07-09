import { CustomizableDashboard } from "@/app/components/CustomizableDashboard";

export default function CustomBIDashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <a
            href="/admin/dashboard"
            className="text-blue-600 hover:underline mb-4 inline-block"
          >
            ← Volver al dashboard
          </a>
          <h1 className="text-4xl font-bold mb-2">
            Dashboard Personalizado
          </h1>
          <p className="text-gray-600">
            Arrastra widgets, personaliza vistas, guarda tu configuración
          </p>
        </div>

        <CustomizableDashboard />
      </div>
    </div>
  );
}
