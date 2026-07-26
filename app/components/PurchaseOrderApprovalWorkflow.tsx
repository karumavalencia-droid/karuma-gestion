"use client";

import { useEffect, useState } from "react";

interface PurchaseOrder {
  id: number;
  supplier_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: string;
  auto_generated: boolean;
  created_at: string;
}

interface Approval {
  id: number;
  purchase_order_id: number;
  requested_by: string;
  requested_at: string;
  approved_by?: string;
  approved_at?: string;
  status: "pending" | "approved" | "rejected";
  rejection_reason?: string;
}

export function PurchaseOrderApprovalWorkflow() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [approvals, setApprovals] = useState<Map<number, Approval>>(new Map());
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");

  useEffect(() => {
    fetchOrders();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Aquí iría un endpoint real para obtener órdenes
      // Por ahora, mostrar interfaz dummy
      setOrders([]);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const approveOrder = async (orderId: number) => {
    // Aquí iría lógica real de aprobación
    console.log(`Aprobando orden ${orderId}`);
  };

  const rejectOrder = async (
    orderId: number,
    reason: string
  ) => {
    // Aquí iría lógica real de rechazo
    console.log(`Rechazando orden ${orderId}: ${reason}`);
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">✅ Workflow de Aprobación</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 rounded ${
              filter === "pending"
                ? "bg-orange-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 rounded ${
              filter === "all"
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            Todas
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Cargando órdenes...</div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <div className="text-6xl mb-3">✅</div>
          <h3 className="text-xl font-bold mb-2">¡Todo en orden!</h3>
          <p className="text-gray-600">
            No hay órdenes pendientes de aprobación
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500"
            >
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-sm text-gray-600">Orden ID</div>
                  <div className="text-lg font-bold">#{order.id}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Cantidad</div>
                  <div className="text-lg font-bold">{order.quantity}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Precio Total</div>
                  <div className="text-lg font-bold text-green-600">
                    €{order.total_price.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Tipo</div>
                  <div className="text-lg font-bold">
                    {order.auto_generated ? "🤖 Automática" : "👤 Manual"}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={() => approveOrder(order.id)}
                  className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
                >
                  ✓ Aprobar
                </button>
                <button
                  onClick={() =>
                    rejectOrder(order.id, "Precio demasiado alto")
                  }
                  className="px-6 py-2 bg-red-600 text-white rounded hover:bg-red-700 font-semibold"
                >
                  ✗ Rechazar
                </button>
                <button className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-semibold">
                  💬 Comentar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Estadísticas */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg shadow p-6">
        <h3 className="font-bold mb-4">📊 Estadísticas de Aprobación</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded p-4">
            <div className="text-sm text-gray-600">Pendientes</div>
            <div className="text-2xl font-bold text-orange-600">0</div>
          </div>
          <div className="bg-white rounded p-4">
            <div className="text-sm text-gray-600">Aprobadas (30d)</div>
            <div className="text-2xl font-bold text-green-600">0</div>
          </div>
          <div className="bg-white rounded p-4">
            <div className="text-sm text-gray-600">Rechazadas (30d)</div>
            <div className="text-2xl font-bold text-red-600">0</div>
          </div>
          <div className="bg-white rounded p-4">
            <div className="text-sm text-gray-600">Tiempo promedio</div>
            <div className="text-2xl font-bold text-blue-600">2h 15m</div>
          </div>
        </div>
      </div>
    </div>
  );
}
