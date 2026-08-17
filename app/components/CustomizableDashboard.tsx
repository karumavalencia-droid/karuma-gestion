"use client";

import { useEffect, useState } from "react";

interface DashboardWidget {
  id: string;
  title: string;
  type: "kpi" | "chart" | "table" | "heatmap";
  position: number;
  enabled: boolean;
}

const AVAILABLE_WIDGETS: DashboardWidget[] = [
  {
    id: "kpi-spending",
    title: "Gasto Total",
    type: "kpi",
    position: 0,
    enabled: true,
  },
  {
    id: "kpi-alerts",
    title: "Alertas Activas",
    type: "kpi",
    position: 1,
    enabled: true,
  },
  {
    id: "kpi-savings",
    title: "Ahorros Potenciales",
    type: "kpi",
    position: 2,
    enabled: true,
  },
  {
    id: "chart-trend",
    title: "Tendencia de Gastos",
    type: "chart",
    position: 3,
    enabled: true,
  },
  {
    id: "chart-suppliers",
    title: "Comparativa Proveedores",
    type: "chart",
    position: 4,
    enabled: true,
  },
  {
    id: "heatmap-prices",
    title: "Heatmap de Precios",
    type: "heatmap",
    position: 5,
    enabled: false,
  },
  {
    id: "table-top-products",
    title: "Top 10 Productos",
    type: "table",
    position: 6,
    enabled: false,
  },
];

export function CustomizableDashboard() {
  const [widgets, setWidgets] = useState<DashboardWidget[]>(AVAILABLE_WIDGETS);
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Cargar dashboard personalizado del localStorage
    const saved = localStorage.getItem("dashboard-config");
    if (saved) {
      try {
        setWidgets(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading dashboard config:", e);
      }
    }
  }, []);

  const toggleWidget = (id: string) => {
    const updated = widgets.map((w) =>
      w.id === id ? { ...w, enabled: !w.enabled } : w
    );
    setWidgets(updated);
  };

  const saveDashboard = () => {
    localStorage.setItem("dashboard-config", JSON.stringify(widgets));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const resetDashboard = () => {
    if (confirm("¿Restaurar configuración por defecto?")) {
      setWidgets(AVAILABLE_WIDGETS);
      localStorage.removeItem("dashboard-config");
    }
  };

  const enabledWidgets = widgets.filter((w) => w.enabled);

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">📊 Dashboard Personalizable</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className={`px-4 py-2 rounded font-semibold ${
              editing
                ? "bg-orange-600 text-white"
                : "bg-blue-600 text-white hover:bg-blue-700"
            }`}
          >
            {editing ? "✓ Guardar" : "✏️ Personalizar"}
          </button>
        </div>
      </div>

      {editing && (
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-600">
          <h3 className="font-bold mb-4">🎨 Personalizar Widgets</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {widgets.map((widget) => (
              <label
                key={widget.id}
                className="flex items-center gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={widget.enabled}
                  onChange={() => toggleWidget(widget.id)}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">{widget.title}</span>
              </label>
            ))}
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <button
              onClick={saveDashboard}
              className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
            >
              {saved ? "✓ Guardado" : "💾 Guardar Configuración"}
            </button>
            <button
              onClick={resetDashboard}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 font-semibold"
            >
              🔄 Restaurar Defaults
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-semibold"
            >
              Cancelar
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-3">
            {enabledWidgets.length} widgets activos • Tu configuración se guarda automáticamente
          </p>
        </div>
      )}

      {/* Grid de Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {enabledWidgets.slice(0, 3).map((widget) => (
          <div
            key={widget.id}
            className="bg-white rounded-lg shadow p-6 border-t-4 border-blue-600"
          >
            <div className="text-gray-600 text-sm font-semibold mb-2">
              {widget.title}
            </div>
            <div className="text-3xl font-bold">
              {widget.id === "kpi-spending" && "€12,500"}
              {widget.id === "kpi-alerts" && "7"}
              {widget.id === "kpi-savings" && "€3,250"}
            </div>
            <div className="text-xs text-gray-500 mt-2">Últimos 6 meses</div>
          </div>
        ))}
      </div>

      {/* Widgets tipo Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {enabledWidgets.filter((w) => w.type === "chart").map((widget) => (
          <div key={widget.id} className="bg-white rounded-lg shadow p-6">
            <h3 className="font-bold mb-4">{widget.title}</h3>
            <div className="h-64 bg-gray-100 rounded flex items-center justify-center text-gray-500">
              Gráfico de {widget.title}
              <br />
              <span className="text-xs">(Renderizar con Recharts)</span>
            </div>
          </div>
        ))}
      </div>

      {/* Widgets Especializados */}
      {enabledWidgets.filter((w) => w.type === "heatmap").length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold mb-4">🔥 Heatmap de Precios</h3>
          <div className="h-48 bg-gray-100 rounded flex items-center justify-center text-gray-500">
            Heatmap de evolución de precios
          </div>
        </div>
      )}

      {enabledWidgets.filter((w) => w.type === "table").length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="font-bold mb-4">📋 Top 10 Productos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Producto</th>
                  <th className="text-right py-2">Gasto</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">$/Unit</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: "GYOZAS", spend: 1200, qty: 500, price: 2.4 },
                  { name: "COSTILLA", spend: 1050, qty: 50, price: 21 },
                  { name: "ALMEJA", spend: 950, qty: 200, price: 4.75 },
                ].map((p) => (
                  <tr key={p.name} className="border-b hover:bg-gray-50">
                    <td className="py-2">{p.name}</td>
                    <td className="text-right">€{p.spend}</td>
                    <td className="text-right">{p.qty}</td>
                    <td className="text-right">€{p.price.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!editing && (
        <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
          💡 Tip: Haz clic en &quot;Personalizar&quot; para agregar/quitar widgets o restaurar la configuración por defecto.
        </div>
      )}
    </div>
  );
}
