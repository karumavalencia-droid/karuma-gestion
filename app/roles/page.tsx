"use client";

import { ROLE_PERMISSIONS } from "@/lib/scheduling-v1/mock";

export default function RolesPage() {
  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Gestión de permisos · tabla de roles (datos mock locales)</p>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Permisos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ROLE_PERMISSIONS.map((row) => (
                <tr key={row.role} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3.5">
                    <span className="font-medium text-gray-900">{row.roleLabel}</span>
                    <span className="ml-2 text-xs text-gray-400">{row.role}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex flex-wrap gap-1.5">
                      {row.permissions.split(", ").map((p) => (
                        <span
                          key={p}
                          className="inline-flex rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20"
                        >
                          {p}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
