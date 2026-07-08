"use client";

import { useEffect, useState } from "react";

interface Forecast {
  year_month: string;
  forecast_quantity: number;
  forecast_cost: number;
  cost_per_unit: number;
  confidence: number;
}

interface ForecastData {
  historical_months: number;
  metrics: {
    avg_monthly_quantity: number;
    avg_monthly_cost: number;
    quantity_trend: number;
    cost_trend: number;
  };
  forecast: Forecast[];
}

export function SupplierForecast({ supplierId = 7331 }: { supplierId?: number }) {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState(3);

  useEffect(() => {
    fetchForecast();
  }, [supplierId, months]);

  async function fetchForecast() {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/suppliers/forecast?supplier_id=${supplierId}&months=${months}`,
      );

      if (!response.ok) {
        throw new Error("Error al cargar pronóstico");
      }

      const data = await response.json();
      setData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Calculando pronóstico...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (!data || data.forecast.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        Sin datos suficientes para pronóstico
      </div>
    );
  }

  const { metrics, forecast } = data;

  // Calcular si hay tendencia al alza o baja
  const costTrendDirection = metrics.cost_trend > 1 ? "↑" : metrics.cost_trend < 1 ? "↓" : "→";
  const costTrendPercent = Math.round((metrics.cost_trend - 1) * 100);

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-lg">Pronóstico de Gastos</h3>
        <div className="flex gap-2">
          <select
            value={months}
            onChange={(e) => setMonths(parseInt(e.target.value))}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value={3}>3 meses</option>
            <option value={6}>6 meses</option>
            <option value={12}>12 meses</option>
          </select>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded border">
          <p className="text-sm text-gray-600">Promedio Mensual (Cantidad)</p>
          <p className="text-2xl font-bold text-blue-600">
            {metrics.avg_monthly_quantity.toFixed(1)}
          </p>
        </div>
        <div className="bg-green-50 p-4 rounded border">
          <p className="text-sm text-gray-600">Promedio Mensual (Costo)</p>
          <p className="text-2xl font-bold text-green-600">
            €{metrics.avg_monthly_cost.toFixed(2)}
          </p>
        </div>
        <div className={`p-4 rounded border ${metrics.cost_trend > 1 ? "bg-red-50" : "bg-green-50"}`}>
          <p className="text-sm text-gray-600">Tendencia de Costo</p>
          <p className={`text-2xl font-bold ${metrics.cost_trend > 1 ? "text-red-600" : "text-green-600"}`}>
            {costTrendDirection} {costTrendPercent > 0 ? "+" : ""}{costTrendPercent}%
          </p>
        </div>
        <div className="bg-purple-50 p-4 rounded border">
          <p className="text-sm text-gray-600">Datos Históricos</p>
          <p className="text-2xl font-bold text-purple-600">{data.historical_months}</p>
          <p className="text-xs text-gray-500">meses</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-4 py-2 text-left">Período</th>
              <th className="px-4 py-2 text-right">Cantidad Estimada</th>
              <th className="px-4 py-2 text-right">Costo Estimado</th>
              <th className="px-4 py-2 text-right">Costo/Unidad</th>
              <th className="px-4 py-2 text-center">Confianza</th>
            </tr>
          </thead>
          <tbody>
            {forecast.map((row) => (
              <tr key={row.year_month} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 font-medium">{row.year_month}</td>
                <td className="px-4 py-2 text-right">
                  {row.forecast_quantity.toFixed(1)} kg
                </td>
                <td className="px-4 py-2 text-right font-bold">
                  €{row.forecast_cost.toFixed(2)}
                </td>
                <td className="px-4 py-2 text-right text-gray-600">
                  €{row.cost_per_unit.toFixed(3)}/kg
                </td>
                <td className="px-4 py-2 text-center">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
                    {(row.confidence * 100).toFixed(0)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 p-4 bg-yellow-50 border border-yellow-300 rounded text-sm text-yellow-800">
        <p className="font-medium mb-1">⚠️ Nota sobre el pronóstico:</p>
        <p>
          Este pronóstico se basa en {data.historical_months} meses de datos históricos usando
          promedio móvil y análisis de tendencias. La confianza es del 75% debido a datos limitados.
          Para mayor precisión, necesitamos al menos 6-12 meses de histórico.
        </p>
      </div>
    </div>
  );
}
