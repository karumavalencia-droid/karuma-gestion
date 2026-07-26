"use client";

import { useEffect, useState } from "react";

interface SpendingSummary {
  id: number;
  supplier_id: number;
  year_month: string;
  total_quantity: number;
  total_cost: number;
  product_count: number;
  created_at: string;
  updated_at: string;
}

export function SupplierSpendingReport({ supplierId = 7331 }: { supplierId?: number }) {
  const [summary, setSummary] = useState<SpendingSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSpendingSummary();
  }, [supplierId]);

  async function fetchSpendingSummary() {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/suppliers/spending?supplier_id=${supplierId}`,
      );

      if (!response.ok) {
        throw new Error("Error al cargar gastos");
      }

      const data = await response.json();
      setSummary(data.summary || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

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

  if (summary.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        Sin datos de gastos disponibles
      </div>
    );
  }

  const totalQuantity = summary.reduce((sum, s) => sum + (s.total_quantity || 0), 0);
  const totalCost = summary.reduce((sum, s) => sum + (s.total_cost || 0), 0);
  const avgCostPerMonth = summary.length > 0 ? totalCost / summary.length : 0;

  return (
    <div className="w-full">
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded border">
          <p className="text-sm text-gray-600">Total Cantidad</p>
          <p className="text-2xl font-bold text-blue-600">{totalQuantity.toFixed(2)}</p>
        </div>
        <div className="bg-green-50 p-4 rounded border">
          <p className="text-sm text-gray-600">Total Gasto</p>
          <p className="text-2xl font-bold text-green-600">€{totalCost.toFixed(2)}</p>
        </div>
        <div className="bg-purple-50 p-4 rounded border">
          <p className="text-sm text-gray-600">Promedio/Mes</p>
          <p className="text-2xl font-bold text-purple-600">€{avgCostPerMonth.toFixed(2)}</p>
        </div>
        <div className="bg-orange-50 p-4 rounded border">
          <p className="text-sm text-gray-600">Periodos</p>
          <p className="text-2xl font-bold text-orange-600">{summary.length}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-4 py-2 text-left">Período</th>
              <th className="px-4 py-2 text-right">Cantidad</th>
              <th className="px-4 py-2 text-right">Costo Total</th>
              <th className="px-4 py-2 text-right">Costo/Unidad</th>
              <th className="px-4 py-2 text-center">Productos</th>
            </tr>
          </thead>
          <tbody>
            {summary.map((row) => {
              const costPerUnit =
                row.total_quantity > 0
                  ? (row.total_cost || 0) / row.total_quantity
                  : 0;

              return (
                <tr key={row.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{row.year_month}</td>
                  <td className="px-4 py-2 text-right">
                    {(row.total_quantity || 0).toFixed(2)} kg
                  </td>
                  <td className="px-4 py-2 text-right font-bold">
                    €{(row.total_cost || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-600">
                    €{costPerUnit.toFixed(3)}/kg
                  </td>
                  <td className="px-4 py-2 text-center text-gray-600">
                    {row.product_count || 0}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded border">
        <p className="text-sm text-gray-600">
          Gasto Promedio por Unidad: <span className="font-bold">€{(totalCost / Math.max(totalQuantity, 1)).toFixed(3)}</span>
        </p>
      </div>
    </div>
  );
}
