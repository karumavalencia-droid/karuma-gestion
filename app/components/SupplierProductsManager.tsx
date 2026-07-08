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

export function SupplierProductsManager({ supplierId = 7331 }: { supplierId?: number }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProduct, setNewProduct] = useState({
    product_name: "",
    quantity: "",
    unit: "KG",
  });

  useEffect(() => {
    fetchProducts();
  }, [supplierId]);

  useEffect(() => {
    const filtered = products.filter((p) =>
      p.product_name.toLowerCase().includes(searchTerm.toLowerCase()),
    );
    setFilteredProducts(filtered);
  }, [searchTerm, products]);

  async function fetchProducts() {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/suppliers/products?supplier_id=${supplierId}`,
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

  async function updateQuantity(id: number, newQuantity: number) {
    try {
      const response = await fetch(`/api/suppliers/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity: newQuantity }),
      });

      if (!response.ok) throw new Error("Error al actualizar");

      const updated = await response.json();
      setProducts(
        products.map((p) =>
          p.id === id ? { ...p, quantity: newQuantity } : p,
        ),
      );
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  }

  async function deleteProduct(id: number) {
    if (!confirm("¿Eliminar este producto?")) return;

    try {
      const response = await fetch(`/api/suppliers/products/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Error al eliminar");

      setProducts(products.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  }

  async function addProduct() {
    if (!newProduct.product_name || !newProduct.quantity) {
      alert("Completa todos los campos");
      return;
    }

    try {
      const response = await fetch("/api/suppliers/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplier_id: supplierId,
          products: [
            {
              product_name: newProduct.product_name,
              quantity: parseFloat(newProduct.quantity),
              unit: newProduct.unit,
              rango: Math.max(...products.map((p) => p.rango || 0)) + 1,
            },
          ],
        }),
      });

      if (!response.ok) throw new Error("Error al agregar");

      await fetchProducts();
      setNewProduct({ product_name: "", quantity: "", unit: "KG" });
      setShowAddForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  }

  function exportToCSV() {
    const csv = [
      ["Rango", "Producto", "Cantidad", "Unidad"].join(","),
      ...filteredProducts.map((p) =>
        [p.rango, `"${p.product_name}"`, p.quantity, p.unit].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `productos-${supplierId}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  }

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

  const totalQuantity = filteredProducts.reduce(
    (sum, p) => sum + parseFloat(String(p.quantity)),
    0,
  );

  return (
    <div className="w-full">
      <div className="mb-6 grid grid-cols-4 gap-4">
        <div className="bg-gray-50 p-4 rounded border">
          <p className="text-sm text-gray-600">Productos</p>
          <p className="text-2xl font-bold">{filteredProducts.length}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded border">
          <p className="text-sm text-gray-600">Total cantidad</p>
          <p className="text-2xl font-bold">{totalQuantity.toFixed(2)}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded border">
          <p className="text-sm text-gray-600">Proveedor</p>
          <p className="text-2xl font-bold">#{supplierId}</p>
        </div>
        <div className="bg-gray-50 p-4 rounded border">
          <p className="text-sm text-gray-600">Acciones</p>
          <div className="flex gap-2 mt-2">
            <button
              onClick={exportToCSV}
              className="px-3 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              Exportar
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="px-3 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
            >
              Agregar
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-3 py-2 border rounded"
        />
      </div>

      {showAddForm && (
        <div className="mb-4 p-4 border rounded bg-gray-50">
          <div className="grid grid-cols-4 gap-2">
            <input
              type="text"
              placeholder="Nombre"
              value={newProduct.product_name}
              onChange={(e) =>
                setNewProduct({ ...newProduct, product_name: e.target.value })
              }
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              type="number"
              placeholder="Cantidad"
              value={newProduct.quantity}
              onChange={(e) =>
                setNewProduct({ ...newProduct, quantity: e.target.value })
              }
              className="px-3 py-2 border rounded text-sm"
            />
            <select
              value={newProduct.unit}
              onChange={(e) =>
                setNewProduct({ ...newProduct, unit: e.target.value })
              }
              className="px-3 py-2 border rounded text-sm"
            >
              <option>KG</option>
              <option>UD</option>
              <option>RA</option>
              <option>BT</option>
            </select>
            <button
              onClick={addProduct}
              className="px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-gray-100 border-b">
              <th className="px-4 py-2 text-left">#</th>
              <th className="px-4 py-2 text-left">Producto</th>
              <th className="px-4 py-2 text-right">Cantidad</th>
              <th className="px-4 py-2 text-center">Unidad</th>
              <th className="px-4 py-2 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.map((product) => (
              <tr key={product.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 text-gray-500">{product.rango}</td>
                <td className="px-4 py-2">{product.product_name}</td>
                <td className="px-4 py-2 text-right font-medium">
                  {editingId === product.id ? (
                    <input
                      type="number"
                      value={editValue || ""}
                      onChange={(e) => setEditValue(parseFloat(e.target.value))}
                      className="w-20 px-2 py-1 border rounded text-sm"
                      autoFocus
                    />
                  ) : (
                    parseFloat(String(product.quantity)).toFixed(2)
                  )}
                </td>
                <td className="px-4 py-2 text-center text-gray-600">
                  {product.unit}
                </td>
                <td className="px-4 py-2 text-center">
                  {editingId === product.id ? (
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() =>
                          updateQuantity(product.id, editValue || 0)
                        }
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-2 py-1 bg-gray-400 text-white text-xs rounded hover:bg-gray-500"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => {
                          setEditingId(product.id);
                          setEditValue(product.quantity);
                        }}
                        className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                      >
                        Eliminar
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
