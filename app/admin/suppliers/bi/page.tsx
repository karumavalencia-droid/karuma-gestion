import { AdvancedBI } from "@/app/components/AdvancedBI";

export default function BIPage() {
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
          <h1 className="text-4xl font-bold mb-2">Business Intelligence Avanzado</h1>
          <p className="text-gray-600">
            Análisis profundo, correlaciones, heatmaps y scorecards de proveedores
          </p>
        </div>

        <AdvancedBI />
      </div>
    </div>
  );
}
