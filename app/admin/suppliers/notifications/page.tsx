import { NotificationCenter } from "@/app/components/NotificationCenter";
import { NotificationPreferences } from "@/app/components/NotificationPreferences";

export default function NotificationsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto p-6">
        <a
          href="/admin/suppliers"
          className="text-blue-600 hover:underline mb-4 inline-block"
        >
          ← Volver a proveedores
        </a>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <NotificationCenter userId="admin" />
          </div>

          <div>
            <NotificationPreferences userId="admin" />
          </div>
        </div>
      </div>
    </div>
  );
}
