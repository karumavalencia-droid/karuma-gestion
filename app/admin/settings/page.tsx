import { UserManagement } from "@/app/components/UserManagement";
import { PurchaseOrderApprovalWorkflow } from "@/app/components/PurchaseOrderApprovalWorkflow";

export default function AdminSettingsPage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <a
            href="/admin/dashboard"
            className="text-blue-600 hover:underline mb-4 inline-block"
          >
            ← Volver al dashboard
          </a>
          <h1 className="text-4xl font-bold mb-2">⚙️ Administración</h1>
          <p className="text-gray-600">
            Gestión de usuarios, roles y workflow de aprobación
          </p>
        </div>

        <div className="space-y-8">
          <div className="bg-white rounded-lg shadow p-6">
            <UserManagement />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <PurchaseOrderApprovalWorkflow />
          </div>
        </div>
      </div>
    </div>
  );
}
