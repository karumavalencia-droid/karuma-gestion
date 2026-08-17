"use client";

import { useEffect, useState } from "react";

interface Supplier {
  id: number;
  name: string;
  product_count: number;
  avg_cost: number;
  total_cost: number;
  avg_quantity: number;
  /** Agregación `supplier_products(count)` devuelta por /api/suppliers. */
  supplier_products?: Array<{ count?: number }>;
}

export function SupplierBenchmark() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBenchmarkData();
  }, []);

  async function fetchBenchmarkData() {
    try {
      setLoading(true);

      // Obtener todos los proveedores
      const suppliersRes = await fetch("/api/suppliers");
      const suppliersData = await suppliersRes.json();

      // Para cada proveedor, obtener gastos
      const benchmarkData = await Promise.all(
        suppliersData.suppliers.map(async (supplier: Supplier) => {
          const spendingRes = await fetch(
            `/api/suppliers/spending?supplier_id=${supplier.id}`,
          );
          const spendingData = await spendingRes.json();

          const totalCost = spendingData.totals?.total_cost || 0;
          const totalQuantity = spendingData.totals?.total_quantity || 0;
          const avgCost = spendingData.summary.length > 0
            ? totalCost / spendingData.summary.length
            : 0;

          return {
            id: supplier.id,
            name: supplier.name,
            product_count: supplier.supplier_products?.length || 0,
            avg_cost: avgCost,
            total_cost: totalCost,
            avg_quantity: totalQuantity / Math.max(spendingData.summary.length, 1),
          };
        }),
      );

      setSuppliers(benchmarkData.sort((a, b) => b.total_cost - a.total_cost));
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Cargando benchmark...</div>;
  }

  if (suppliers.length === 0) {
    return <div className="p-6 text-center text-gray-500">Sin proveedores</div>;
  }

  const avgCostAll = suppliers.reduce((sum, s) => sum + s.avg_cost, 0) / suppliers.length;
  const maxCost = Math.max(...suppliers.map((s) => s.avg_cost));
  const minCost = Math.min(...suppliers.map((s) => s.avg_cost));

  return (
    <div className="w-full">
      <h3 className="font-bold text-lg mb-6">Benchmarking: Comparación de Proveedores</h3>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="bg-blue-50 p-4 rounded border">
          <p className="text-sm text-gray-600">Promedio General</p>
          <p className="text-2xl font-bold text-blue-600">€{avgCostAll.toFixed(2)}</p>
        </div>
        <div className="bg-green-50 p-4 rounded border">
          <p className="text-sm text-gray-600">Más Económico</p>
          <p className="text-2xl font-bold text-green-600">€{minCost.toFixed(2)}</p>
        </div>
        <div className="bg-red-50 p-4 rounded border">
          <p className="text-sm text-gray-600">Más Caro</p>
          <p className="text-2xl font-bold text-red-600">€{maxCost.toFixed(2)}</p>
        </div>
      </div>

      <div className="space-y-3">
        {suppliers.map((supplier) => {
          const percentOfAvg = ((supplier.avg_cost / avgCostAll) * 100 - 100).toFixed(1);
          const isAboveAvg = supplier.avg_cost > avgCostAll;

          return (
            <div
              key={supplier.id}
              className="p-4 border rounded hover:shadow-md transition"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h4 className="font-bold">{supplier.name}</h4>
                  <p className="text-sm text-gray-600">
                    {supplier.product_count} productos | {supplier.avg_quantity.toFixed(1)} kg/mes
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold">€{supplier.avg_cost.toFixed(2)}/mes</p>
                  <p
                    className={`text-sm font-medium ${isAboveAvg ? "text-red-600" : "text-green-600"}`}
                  >
                    {isAboveAvg ? "+" : ""}{percentOfAvg}% vs promedio
                  </p>
                </div>
              </div>

              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition ${
                    isAboveAvg ? "bg-red-500" : "bg-green-500"
                  }`}
                  style={{
                    width: `${Math.min((supplier.avg_cost / maxCost) * 100, 100)}%`,
                  }}
                />
              </div>

              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500">
                <p>Total: €{supplier.total_cost.toFixed(2)}</p>
                <p>Eficiencia: {((avgCostAll / supplier.avg_cost) * 100).toFixed(0)}%</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 p-4 bg-green-50 border border-green-300 rounded text-sm text-green-800">
        <p className="font-medium">💡 Insight:</p>
        {suppliers.length > 1 && (
          <p>
            El proveedor más económico es <strong>{suppliers[suppliers.length - 1].name}</strong> (
            €{suppliers[suppliers.length - 1].avg_cost.toFixed(2)}/mes).
          </p>
        )}
      </div>
    </div>
  );
}
