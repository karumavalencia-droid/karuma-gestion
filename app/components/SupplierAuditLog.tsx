"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface AuditLog {
  id: number;
  supplier_product_id: number;
  supplier_id: number;
  action: string;
  changed_fields: Record<string, unknown>;
  old_values: Record<string, unknown>;
  new_values: Record<string, unknown>;
  changed_by: string;
  changed_at: string;
}

export function SupplierAuditLog({ supplierId }: { supplierId?: number }) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (supplierId) params.append("supplier_id", supplierId.toString());
      params.append("limit", "50");

      const response = await fetch(`/api/suppliers/audit?${params}`);

      if (!response.ok) {
        throw new Error("Error al cargar auditoría");
      }

      const data = await response.json();
      setLogs(data.logs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }, [supplierId]);

  useEffect(() => {
    void fetchAuditLogs();
  }, [fetchAuditLogs]);

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Cargando...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (logs.length === 0) {
    return <div className="p-6 text-center text-gray-500">Sin cambios registrados</div>;
  }

  const actionColors: Record<string, string> = {
    created: "bg-green-100 text-green-800",
    updated: "bg-blue-100 text-blue-800",
    deleted: "bg-red-100 text-red-800",
  };

  return (
    <div className="w-full">
      <h3 className="font-bold text-lg mb-4">Historial de Cambios</h3>

      <div className="space-y-4">
        {logs.map((log) => (
          <div
            key={log.id}
            className="border rounded-lg p-4 hover:shadow-md transition"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-1 rounded text-sm font-medium ${
                    actionColors[log.action] || "bg-gray-100"
                  }`}
                >
                  {log.action}
                </span>
                <span className="text-sm text-gray-600">
                  {formatDistanceToNow(new Date(log.changed_at), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                Por: {log.changed_by || "sistema"}
              </span>
            </div>

            {log.changed_fields && Object.keys(log.changed_fields).length > 0 && (
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {Object.entries(log.changed_fields).map(([field, value]) => (
                  <div key={field} className="bg-gray-50 p-2 rounded">
                    <p className="text-gray-600">{field}</p>
                    <p className="font-medium text-gray-900">
                      {Boolean(log.old_values?.[field]) && (
                        <>
                          <span className="text-red-600">
                            {String(log.old_values[field])}
                          </span>
                          <span className="mx-1">→</span>
                        </>
                      )}
                      <span className="text-green-600">
                        {String(log.new_values?.[field] || value)}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
