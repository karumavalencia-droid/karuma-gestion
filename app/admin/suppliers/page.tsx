import { SuppliersOverview } from "@/app/components/SuppliersOverview";

export default function SuppliersPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Gestión de Proveedores</h1>
          <p className="text-gray-600">
            Administra tus proveedores y sus productos
          </p>
        </div>

        <SuppliersOverview />
      </div>
    </div>
  );
}
