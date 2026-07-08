"use client";

import { useEffect, useState } from "react";

interface KPI {
  totalSpending: number;
  avgSupplierCost: number;
  potentialSavings: number;
  activeAlerts: number;
  topSupplier: { name: string; spending: number };
  mostExpensive: { name: string; cost: number };
  forecastAccuracy: number;
  trendDirection: "up" | "down" | "stable";
}

export function ExecutiveDashboard() {
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState("6"); // meses

  useEffect(() => {
    fetchKPIs();
    const interval = setInterval(fetchKPIs, 60000); // Actualizar cada minuto
    return () => clearInterval(interval);
  }, [period]);

  const fetchKPIs = async () => {
    try {
      const res = await fetch(`/api/suppliers/kpis?period=${period}`);
      const data = await res.json();
      if (data.success) {
        setKpi(data.kpi);
      }
    } catch (error) {
      console.error("Error fetching KPIs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Cargando dashboard...</div>;
  if (!kpi) return <div>No hay datos disponibles</div>;

  const savingsPercent = ((kpi.potentialSavings / kpi.totalSpending) * 100).toFixed(1);

  return (
    <div className="w-full space-y-6">
      {/* Header con periodo */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">📊 Dashboard Ejecutivo</h2>
        <div className="flex gap-2">
          {["1", "3", "6", "12"].map((m) => (
            <button
              key={m}
              onClick={() => setPeriod(m)}
              className={`px-4 py-2 rounded ${
                period === m
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {m} meses
            </button>
          ))}
        </div>
      </div>

      {/* Grid de KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Spending */}
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-600">
          <div className="text-gray-600 text-sm font-semibold">GASTO TOTAL</div>
          <div className="text-3xl font-bold mt-2">€{kpi.totalSpending.toLocaleString('es-ES')}</div>
          <div className="text-xs text-gray-500 mt-2">Últimos {period} meses</div>
        </div>

        {/* Average Cost per Supplier */}
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-green-600">
          <div className="text-gray-600 text-sm font-semibold">GASTO PROMEDIO</div>
          <div className="text-3xl font-bold mt-2">€{kpi.avgSupplierCost.toLocaleString('es-ES')}</div>
          <div className="text-xs text-gray-500 mt-2">Por proveedor/mes</div>
        </div>

        {/* Potential Savings */}
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-green-700">
          <div className="text-gray-600 text-sm font-semibold">AHORROS POTENCIALES</div>
          <div className="text-3xl font-bold mt-2 text-green-700">
            €{kpi.potentialSavings.toLocaleString('es-ES')}
          </div>
          <div className="text-xs text-green-600 mt-2">{savingsPercent}% del total</div>
        </div>

        {/* Active Alerts */}
        <div className="bg-white rounded-lg shadow p-6 border-t-4 border-red-600">
          <div className="text-gray-600 text-sm font-semibold">ALERTAS ACTIVAS</div>
          <div className="text-3xl font-bold mt-2 text-red-600">{kpi.activeAlerts}</div>
          <div className="text-xs text-red-500 mt-2">Requieren atención</div>
        </div>
      </div>

      {/* Tendencias y Proveedores */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold mb-4">📈 Tendencia</h3>
          <div className="text-center py-8">
            {kpi.trendDirection === "up" && (
              <div className="text-4xl text-red-600 mb-2">↑</div>
            )}
            {kpi.trendDirection === "down" && (
              <div className="text-4xl text-green-600 mb-2">↓</div>
            )}
            {kpi.trendDirection === "stable" && (
              <div className="text-4xl text-blue-600 mb-2">→</div>
            )}
            <div className="text-lg font-semibold">
              {kpi.trendDirection === "up" && "Costos en alza"}
              {kpi.trendDirection === "down" && "Costos bajando"}
              {kpi.trendDirection === "stable" && "Costos estables"}
            </div>
            <div className="text-sm text-gray-500 mt-2">
              {kpi.trendDirection === "up" && "Renegociar contratos"}
              {kpi.trendDirection === "down" && "Excelente, mantener"}
              {kpi.trendDirection === "stable" && "Situación normal"}
            </div>
          </div>
        </div>

        {/* Top Supplier */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold mb-4">⭐ Proveedor Principal</h3>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-blue-600">
              {kpi.topSupplier.name}
            </div>
            <div className="text-lg font-semibold">
              €{kpi.topSupplier.spending.toLocaleString('es-ES')}/mes
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-4">
              <div
                className="bg-blue-600 h-2 rounded-full"
                style={{ width: "75%" }}
              ></div>
            </div>
            <div className="text-xs text-gray-500">
              75% del volumen de compra
            </div>
          </div>
        </div>

        {/* Most Expensive Product */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold mb-4">💸 Producto Más Caro</h3>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-orange-600">
              {kpi.mostExpensive.name}
            </div>
            <div className="text-lg font-semibold">
              €{kpi.mostExpensive.cost.toLocaleString('es-ES')}/unidad
            </div>
            <div className="text-xs text-gray-500 mt-4 p-2 bg-orange-50 rounded">
              💡 Considera negociar o buscar alternativas
            </div>
          </div>
        </div>
      </div>

      {/* Forecast Accuracy */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-bold mb-4">🎯 Precisión de Pronósticos</h3>
        <div className="flex items-center gap-6">
          <div className="text-5xl font-bold text-green-600">
            {kpi.forecastAccuracy}%
          </div>
          <div className="flex-1">
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div
                className="bg-green-600 h-4 rounded-full"
                style={{ width: `${kpi.forecastAccuracy}%` }}
              ></div>
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {kpi.forecastAccuracy >= 85 && "✓ Excelente - Usar para planificación"}
              {kpi.forecastAccuracy >= 75 && kpi.forecastAccuracy < 85 && "~ Buena - Relativemente confiable"}
              {kpi.forecastAccuracy < 75 && "⚠ Aceptable - Revisar en 1-2 meses"}
            </div>
          </div>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow p-6 border-l-4 border-green-600">
        <h3 className="font-bold mb-3">💡 Recomendaciones Principales</h3>
        <div className="space-y-2 text-sm">
          <div>✓ Ahorro potencial: <strong>€{kpi.potentialSavings.toLocaleString('es-ES')}</strong> en {period} meses</div>
          <div>⚠ Alertas pendientes: <strong>{kpi.activeAlerts}</strong> acciones requeridas</div>
          <div>📊 Precisión: <strong>{kpi.forecastAccuracy}%</strong> - Usar para planificación</div>
          <div>🎯 Siguiente paso: <strong>Revisar recomendaciones</strong> en Analytics</div>
        </div>
      </div>
    </div>
  );
}
