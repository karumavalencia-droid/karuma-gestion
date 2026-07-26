"use client";

import { useEffect, useState } from "react";

interface AlertProduct {
  id: number;
  product_name: string;
  quantity: number;
  unit: string;
  unit_price: number;
  stock_threshold: number;
}

interface PurchaseOrder {
  supplierId: number;
  supplierName: string;
  items: AlertProduct[];
  totalCost: number;
  estimatedDelivery: string;
}

export function PurchaseOrderGenerator({ supplierId }: { supplierId?: number }) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generatePurchaseOrders = async () => {
    try {
      setLoading(true);

      // Obtener alertas de stock bajo
      const res = await fetch(`/api/suppliers/alerts/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: supplierId,
          check_type: "low_stock",
        }),
      });

      if (!res.ok) throw new Error("Error generando órdenes");

      const data = await res.json();

      // Agrupar por proveedor
      const grouped = new Map<number, AlertProduct[]>();

      // En producción, obtener los productos con stock bajo
      // Por ahora, crear órdenes dummy

      // Crear una orden de ejemplo
      if (supplierId) {
        const exampleOrder: PurchaseOrder = {
          supplierId,
          supplierName: `Proveedor ${supplierId}`,
          items: [
            {
              id: 1,
              product_name: "GYOZAS DE CERDO",
              quantity: 50,
              unit: "UNIDAD",
              unit_price: 2.5,
              stock_threshold: 50,
            },
          ],
          totalCost: 125,
          estimatedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            .toLocaleDateString("es-ES"),
        };

        setOrders([exampleOrder]);
        setGenerated(true);
      }
    } catch (error) {
      console.error("Error generating purchase orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportAsCSV = (order: PurchaseOrder) => {
    const csv = [
      ["Orden de Compra Automática"],
      ["Proveedor", order.supplierName],
      ["Fecha", new Date().toLocaleDateString("es-ES")],
      ["Entrega Estimada", order.estimatedDelivery],
      [],
      ["Producto", "Cantidad", "Unidad", "Precio Unitario", "Total"],
      ...order.items.map((item) => [
        item.product_name,
        item.quantity,
        item.unit,
        `€${item.unit_price.toFixed(2)}`,
        `€${(item.quantity * item.unit_price).toFixed(2)}`,
      ]),
      [],
      ["TOTAL", "", "", "", `€${order.totalCost.toFixed(2)}`],
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PO_${order.supplierId}_${Date.now()}.csv`;
    a.click();
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">📋 Órdenes de Compra Automáticas</h3>
        <button
          onClick={generatePurchaseOrders}
          disabled={loading}
          className={`px-4 py-2 rounded text-sm font-semibold ${
            loading
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700"
          }`}
        >
          {loading ? "Generando..." : "Generar Órdenes"}
        </button>
      </div>

      {!generated && (
        <div className="text-center py-8 text-gray-500">
          Haz clic en "Generar Órdenes" para crear órdenes de compra automáticas
          basadas en alertas de stock bajo.
        </div>
      )}

      {orders.length > 0 && (
        <div className="space-y-4">
          {orders.map((order, idx) => (
            <div
              key={idx}
              className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-bold text-lg">{order.supplierName}</h4>
                  <p className="text-sm text-gray-500">
                    Entrega estimada: {order.estimatedDelivery}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    €{order.totalCost.toFixed(2)}
                  </div>
                  <button
                    onClick={() => exportAsCSV(order)}
                    className="text-blue-600 hover:underline text-sm mt-2"
                  >
                    ⬇️ Exportar CSV
                  </button>
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Producto</th>
                    <th className="text-right py-2">Cantidad</th>
                    <th className="text-right py-2">Precio</th>
                    <th className="text-right py-2">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="py-2">{item.product_name}</td>
                      <td className="text-right">
                        {item.quantity} {item.unit}
                      </td>
                      <td className="text-right">€{item.unit_price.toFixed(2)}</td>
                      <td className="text-right">
                        €{(item.quantity * item.unit_price).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex gap-2 mt-4">
                <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
                  ✓ Confirmar Orden
                </button>
                <button className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300">
                  📧 Enviar por Email
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
