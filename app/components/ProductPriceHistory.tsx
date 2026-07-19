"use client";

import { useEffect, useState } from "react";

interface Price {
  id: number;
  supplier_product_id: number;
  supplier_id: number;
  product_name: string;
  unit_price: number;
  currency: string;
  effective_date: string;
  notes: string;
  created_at: string;
}

export function ProductPriceHistory({
  supplierId,
  productId,
}: {
  supplierId?: number;
  productId?: number;
}) {
  const [prices, setPrices] = useState<Price[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState({
    unit_price: "",
    effective_date: new Date().toISOString().split("T")[0],
    notes: "",
  });
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    fetchPrices();
  }, [supplierId, productId]);

  async function fetchPrices() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (supplierId) params.append("supplier_id", supplierId.toString());
      if (productId) params.append("product_id", productId.toString());

      const response = await fetch(`/api/suppliers/prices?${params}`);

      if (!response.ok) {
        throw new Error("Error al cargar precios");
      }

      const data = await response.json();
      setPrices(data.prices || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function addPrice() {
    if (!newPrice.unit_price) {
      alert("Precio requerido");
      return;
    }

    try {
      const response = await fetch("/api/suppliers/prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_product_id: productId,
          supplier_id: supplierId,
          unit_price: parseFloat(newPrice.unit_price),
          effective_date: newPrice.effective_date,
          notes: newPrice.notes,
        }),
      });

      if (!response.ok) throw new Error("Error al agregar precio");
      const data = await response.json() as { price?: Price };
      if (data.price) setPrices((current) => [data.price!, ...current]);
      setNewPrice({
        unit_price: "",
        effective_date: new Date().toISOString().split("T")[0],
        notes: "",
      });
      setShowAddForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Cargando precios...</div>;
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const avgPrice =
    prices.length > 0
      ? prices.reduce((sum, p) => sum + p.unit_price, 0) / prices.length
      : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices.map((p) => p.unit_price)) : 0;
  const minPrice =
    prices.length > 0
      ? Math.min(...prices.map((p) => p.unit_price))
      : 0;

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-4">
        <h3 className="font-bold text-lg">Historial de Precios</h3>
        {productId && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
          >
            {showAddForm ? "Cancelar" : "Agregar Precio"}
          </button>
        )}
      </div>

      {prices.length > 0 && (
        <div className="mb-4 grid grid-cols-3 gap-2">
          <div className="bg-blue-50 p-2 rounded border">
            <p className="text-xs text-gray-600">Promedio</p>
            <p className="text-lg font-bold text-blue-600">€{avgPrice.toFixed(2)}</p>
          </div>
          <div className="bg-green-50 p-2 rounded border">
            <p className="text-xs text-gray-600">Mínimo</p>
            <p className="text-lg font-bold text-green-600">€{minPrice.toFixed(2)}</p>
          </div>
          <div className="bg-red-50 p-2 rounded border">
            <p className="text-xs text-gray-600">Máximo</p>
            <p className="text-lg font-bold text-red-600">€{maxPrice.toFixed(2)}</p>
          </div>
        </div>
      )}

      {showAddForm && (
        <div className="mb-4 p-4 border rounded bg-gray-50">
          <div className="grid grid-cols-4 gap-2">
            <input
              type="number"
              placeholder="Precio"
              value={newPrice.unit_price}
              onChange={(e) =>
                setNewPrice({ ...newPrice, unit_price: e.target.value })
              }
              step="0.01"
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              type="date"
              value={newPrice.effective_date}
              onChange={(e) =>
                setNewPrice({ ...newPrice, effective_date: e.target.value })
              }
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              type="text"
              placeholder="Notas"
              value={newPrice.notes}
              onChange={(e) =>
                setNewPrice({ ...newPrice, notes: e.target.value })
              }
              className="px-3 py-2 border rounded text-sm col-span-2"
            />
            <button
              onClick={addPrice}
              className="col-span-4 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Guardar Precio
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-4 py-2 text-left">Fecha</th>
              <th className="px-4 py-2 text-right">Precio/Unidad</th>
              <th className="px-4 py-2 text-left">Moneda</th>
              <th className="px-4 py-2 text-left">Notas</th>
            </tr>
          </thead>
          <tbody>
            {prices.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-3 text-center text-gray-500">
                  Sin precios registrados
                </td>
              </tr>
            ) : (
              prices.map((price) => (
                <tr key={price.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{price.effective_date}</td>
                  <td className="px-4 py-2 text-right font-bold">
                    €{price.unit_price.toFixed(2)}
                  </td>
                  <td className="px-4 py-2">{price.currency}</td>
                  <td className="px-4 py-2 text-gray-600 text-xs">
                    {price.notes || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
