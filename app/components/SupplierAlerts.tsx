"use client";

import { useEffect, useState } from "react";

interface Alert {
  id: number;
  supplier_product_id: number;
  supplier_id: number;
  alert_type: string;
  threshold_value: number;
  current_value: number;
  alert_message: string;
  is_active: boolean;
  created_at: string;
  resolved_at: string | null;
}

const alertColors: Record<string, string> = {
  low_stock: "bg-yellow-100 border-yellow-300 text-yellow-800",
  price_change: "bg-orange-100 border-orange-300 text-orange-800",
  no_purchase_recent: "bg-red-100 border-red-300 text-red-800",
};

const alertIcons: Record<string, string> = {
  low_stock: "⚠️",
  price_change: "📈",
  no_purchase_recent: "⏰",
};

export function SupplierAlerts({ supplierId }: { supplierId?: number }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // En una aplicación real, esto obtendría las alertas de la API
    // Por ahora, mostramos ejemplos
    setLoading(false);
  }, [supplierId]);

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Cargando alertas...</div>;
  }

  if (alerts.length === 0) {
    return (
      <div className="p-4 bg-green-50 border border-green-300 rounded">
        <p className="text-green-800">✓ No hay alertas activas</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-3">
      <h3 className="font-bold text-lg">Alertas Activas</h3>

      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`p-4 border rounded ${alertColors[alert.alert_type] || "bg-gray-100"}`}
        >
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-3 flex-1">
              <span className="text-lg">{alertIcons[alert.alert_type] || "ℹ️"}</span>
              <div>
                <p className="font-medium">{alert.alert_message}</p>
                <p className="text-sm mt-1">
                  {alert.alert_type === "low_stock" && (
                    <>
                      Stock: {alert.current_value} (Umbral: {alert.threshold_value})
                    </>
                  )}
                  {alert.alert_type === "price_change" && (
                    <>
                      Precio anterior: €{alert.threshold_value} → Actual: €{alert.current_value}
                    </>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                // Marcar como resuelta
              }}
              className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
            >
              Resolver
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
