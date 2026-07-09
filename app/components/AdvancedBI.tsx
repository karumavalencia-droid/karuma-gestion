"use client";

import { useEffect, useState } from "react";

interface SupplierMetric {
  name: string;
  spending: number;
  trend: number;
  products: number;
  alerts: number;
}

export function AdvancedBI() {
  const [metrics, setMetrics] = useState<SupplierMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState("6");

  useEffect(() => {
    fetchMetrics();
  }, [timeframe]);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      // Datos dummy para demostración
      const data = [
        { name: "Jet Extramar", spending: 3500, trend: 8, products: 30, alerts: 3 },
        { name: "Komei Distributor", spending: 2100, trend: -5, products: 15, alerts: 1 },
        { name: "Spicy Foods", spending: 4200, trend: 15, products: 25, alerts: 5 },
      ];
      setMetrics(data);
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendColor = (trend: number) => {
    if (trend > 10) return "text-red-600";
    if (trend < -5) return "text-green-600";
    return "text-gray-600";
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return "↑";
    if (trend < 0) return "↓";
    return "→";
  };

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">📊 BI Avanzado</h2>
        <div className="flex gap-2">
          {["1", "3", "6", "12"].map((m) => (
            <button
              key={m}
              onClick={() => setTimeframe(m)}
              className={`px-3 py-1 rounded text-sm ${
                timeframe === m
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700"
              }`}
            >
              {m}m
            </button>
          ))}
        </div>
      </div>

      {/* Gráfico de Comparación de Gastos */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-bold mb-4">💰 Gastos por Proveedor</h3>
        <div className="space-y-3">
          {metrics.map((m) => (
            <div key={m.name}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{m.name}</span>
                <span className="text-gray-600">€{m.spending.toLocaleString()}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min((m.spending / 5000) * 100, 100)}%`,
                  }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Matriz de Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {metrics.map((m) => (
          <div
            key={m.name}
            className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition"
          >
            <h4 className="font-bold text-sm mb-3">{m.name}</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Gasto/mes</span>
                <span className="font-semibold">€{m.spending.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Tendencia</span>
                <span className={`font-semibold ${getTrendColor(m.trend)}`}>
                  {getTrendIcon(m.trend)} {Math.abs(m.trend)}%
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Productos</span>
                <span className="font-semibold">{m.products}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Alertas</span>
                <span className={`font-semibold ${m.alerts > 3 ? "text-orange-600" : "text-gray-600"}`}>
                  {m.alerts}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap de Cambios de Precio */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-bold mb-4">🔥 Heatmap: Cambios de Precio Últimos 6 Meses</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2">Producto</th>
                <th className="text-center py-2 px-2">Mes 1</th>
                <th className="text-center py-2 px-2">Mes 2</th>
                <th className="text-center py-2 px-2">Mes 3</th>
                <th className="text-center py-2 px-2">Mes 4</th>
                <th className="text-center py-2 px-2">Mes 5</th>
                <th className="text-center py-2 px-2">Mes 6</th>
              </tr>
            </thead>
            <tbody>
              {["GYOZAS", "COSTILLA", "ALMEJA"].map((product, idx) => (
                <tr key={product} className="border-b">
                  <td className="py-2 px-2 text-gray-600">{product}</td>
                  {[0, 2, 5, 3, 8, 1].map((change, i) => (
                    <td key={i} className="text-center py-2 px-2">
                      <span
                        className={`px-2 py-1 rounded text-xs font-semibold ${
                          change > 5
                            ? "bg-red-100 text-red-800"
                            : change > 2
                              ? "bg-orange-100 text-orange-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        {change > 0 ? "+" : ""}{change}%
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Análisis de Correlación */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg shadow p-6">
        <h3 className="font-bold mb-4">📈 Análisis de Correlación</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-semibold mb-3">Correlación: Volumen ↔ Precio</h4>
            <div className="space-y-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Jet Extramar</span>
                  <span className="font-semibold">-0.45</span>
                </div>
                <div className="w-full bg-gray-200 rounded h-2">
                  <div
                    className="bg-green-500 h-2 rounded"
                    style={{ width: "45%" }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Komei Distributor</span>
                  <span className="font-semibold">-0.62</span>
                </div>
                <div className="w-full bg-gray-200 rounded h-2">
                  <div
                    className="bg-green-500 h-2 rounded"
                    style={{ width: "62%" }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Spicy Foods</span>
                  <span className="font-semibold">0.22</span>
                </div>
                <div className="w-full bg-gray-200 rounded h-2">
                  <div
                    className="bg-red-500 h-2 rounded"
                    style={{ width: "22%" }}
                  ></div>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-3">
              Verde = descuento por volumen ✓
            </p>
          </div>

          <div>
            <h4 className="text-sm font-semibold mb-3">Volatilidad de Precio</h4>
            <div className="space-y-2">
              {[
                { name: "GYOZAS", vol: 0.08 },
                { name: "COSTILLA", vol: 0.15 },
                { name: "ALMEJA", vol: 0.12 },
              ].map((p) => (
                <div key={p.name}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{p.name}</span>
                    <span className="font-semibold">{(p.vol * 100).toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded h-2">
                    <div
                      className={`h-2 rounded ${
                        p.vol > 0.12
                          ? "bg-red-500"
                          : p.vol > 0.08
                            ? "bg-orange-500"
                            : "bg-green-500"
                      }`}
                      style={{ width: `${p.vol * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-600 mt-3">
              Rojo = alto riesgo, verde = estable
            </p>
          </div>
        </div>
      </div>

      {/* Scorecard de Proveedores */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="font-bold mb-4">🎯 Scorecard de Proveedores</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Proveedor</th>
                <th className="text-center py-2">
                  Calidad
                  <br />
                  (Stock)
                </th>
                <th className="text-center py-2">
                  Precio
                  <br />
                  (vs Promedio)
                </th>
                <th className="text-center py-2">
                  Servicio
                  <br />
                  (Entregas)
                </th>
                <th className="text-center py-2">Score</th>
              </tr>
            </thead>
            <tbody>
              {[
                { name: "Jet Extramar", quality: 85, price: 90, service: 80 },
                { name: "Komei Distributor", quality: 92, price: 95, service: 88 },
                { name: "Spicy Foods", quality: 75, price: 70, service: 78 },
              ].map((supplier) => {
                const score = Math.round((supplier.quality + supplier.price + supplier.service) / 3);
                return (
                  <tr key={supplier.name} className="border-b hover:bg-gray-50">
                    <td className="py-3 font-medium">{supplier.name}</td>
                    <td className="text-center">
                      <span className="px-2 py-1 rounded text-xs bg-blue-100 text-blue-800">
                        {supplier.quality}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                        {supplier.price}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="px-2 py-1 rounded text-xs bg-purple-100 text-purple-800">
                        {supplier.service}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-12 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              score >= 85
                                ? "bg-green-600"
                                : score >= 75
                                  ? "bg-blue-600"
                                  : "bg-orange-600"
                            }`}
                            style={{ width: `${score}%` }}
                          ></div>
                        </div>
                        <span className="font-bold">{score}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights Automáticos */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg shadow p-6 border-l-4 border-green-600">
        <h3 className="font-bold mb-3">💡 Insights Automáticos</h3>
        <div className="space-y-2 text-sm">
          <div>
            ✓ <strong>Oportunidad:</strong> Komei tiene mejor precio y volumen → Renegociar con Jet (-10%)
          </div>
          <div>
            ⚠️ <strong>Riesgo:</strong> Spicy Foods tiene volatilidad de precio 15% → Buscar alternativa
          </div>
          <div>
            📈 <strong>Tendencia:</strong> COSTILLA sube 8% cada mes → Comprar antes del próximo aumento
          </div>
          <div>
            💰 <strong>Ahorro:</strong> Consolidar en Komei podría ahorrar €15,000/año
          </div>
        </div>
      </div>
    </div>
  );
}
