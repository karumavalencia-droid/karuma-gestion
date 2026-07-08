"use client";

import { useEffect, useState } from "react";

interface Product {
  id: number;
  supplier_id: number;
  product_name: string;
  quantity: number;
  unit: string;
  rango: number;
  invoice_date: string;
  created_at: string;
}

export function SupplierProducts({ supplierId = 7331 }: { supplierId?: number }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProducts() {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/suppliers/products?supplier_id=${supplierId}`
        );

        if (!response.ok) {
          throw new Error("Error al cargar productos");
        }

        const data = await response.json();
        setProducts(data.products || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      } finally {
        setLoading(false);
      }
    }

    fetchProducts();
  }, [supplierId]);

  if (loading) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Cargando productos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  const totalQuantity = products.reduce((sum, p) => sum + parseFloat(String(p.quantity)), 0);

  return (
    <div className="w-full">
      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="bg-gray-50 p-4 rounded border">
          <p className="text-sm text-gray-600">Total de productos</p>
          <p className="text-2xl font-bold">{products.length}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded border">
          <p className="text-sm text-gray-600">Total cantidad</p>
          <p className="text-2xl font-bold">{totalQuantity.toFixed(2)}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded border">
          <p className="text-sm text-gray-600">Período</p>
          <p className="text-2xl font-bold">Q2 2026</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Producto</th>
              <th className="px-4 py-2 text-right">Cantidad</th>
              <th className="px-4 py-2 text-center">Unidad</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-500">{product.rango}</td>
                <td className="px-4 py-2">{product.product_name}</td>
                <td className="px-4 py-2 text-right font-medium">
                  {parseFloat(String(product.quantity)).toFixed(2)}
                </td>
                <td className="px-4 py-2 text-center text-gray-600">
                  {product.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
