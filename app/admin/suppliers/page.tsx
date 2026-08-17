import Link from "next/link";
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

          <div className="flex gap-4 mt-4">
            <Link
              href="/admin/suppliers/analytics"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              📊 Analytics
            </Link>
            <Link
              href="/admin/suppliers/notifications"
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              🔔 Notificaciones
            </Link>
          </div>
        </div>

        <SuppliersOverview />
      </div>
    </div>
  );
}
