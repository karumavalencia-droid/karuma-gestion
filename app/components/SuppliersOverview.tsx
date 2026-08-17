"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Supplier {
  id: number;
  name: string;
  contact_email?: string;
  phone?: string;
  website?: string;
  notes?: string;
  supplier_products?: Array<{ id: number }>;
  created_at: string;
  updated_at: string;
}

export function SuppliersOverview() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSupplier, setNewSupplier] = useState({
    id: "",
    name: "",
    contact_email: "",
    phone: "",
    website: "",
    notes: "",
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  async function fetchSuppliers() {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`/api/suppliers?refresh=${Date.now()}`, {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache" },
      });

      if (!response.ok) {
        throw new Error("Error al cargar proveedores");
      }

      const data = await response.json();
      setSuppliers(data.suppliers || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  }

  async function addSupplier() {
    if (!newSupplier.id || !newSupplier.name) {
      alert("ID y nombre requeridos");
      return;
    }

    try {
      const response = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSupplier),
      });

      if (!response.ok) throw new Error("Error al agregar");
      const data = await response.json() as { supplier?: Supplier };
      if (data.supplier) setSuppliers((current) => [data.supplier!, ...current]);
      setNewSupplier({
        id: "",
        name: "",
        contact_email: "",
        phone: "",
        website: "",
        notes: "",
      });
      setShowAddForm(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-gray-500">Cargando...</div>;
  }

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Proveedores</h2>
        <div className="flex gap-2">
          <button
            onClick={fetchSuppliers}
            className="px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded hover:bg-gray-100"
          >
            Actualizar
          </button>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {showAddForm ? "Cancelar" : "Agregar Proveedor"}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded mb-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {showAddForm && (
        <div className="p-4 bg-gray-50 border rounded mb-6">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              placeholder="ID"
              value={newSupplier.id}
              onChange={(e) =>
                setNewSupplier({ ...newSupplier, id: e.target.value })
              }
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              type="text"
              placeholder="Nombre"
              value={newSupplier.name}
              onChange={(e) =>
                setNewSupplier({ ...newSupplier, name: e.target.value })
              }
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              type="email"
              placeholder="Email"
              value={newSupplier.contact_email}
              onChange={(e) =>
                setNewSupplier({ ...newSupplier, contact_email: e.target.value })
              }
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              type="tel"
              placeholder="Teléfono"
              value={newSupplier.phone}
              onChange={(e) =>
                setNewSupplier({ ...newSupplier, phone: e.target.value })
              }
              className="px-3 py-2 border rounded text-sm"
            />
            <input
              type="url"
              placeholder="Website"
              value={newSupplier.website}
              onChange={(e) =>
                setNewSupplier({ ...newSupplier, website: e.target.value })
              }
              className="px-3 py-2 border rounded text-sm col-span-2"
            />
            <input
              type="text"
              placeholder="Notas"
              value={newSupplier.notes}
              onChange={(e) =>
                setNewSupplier({ ...newSupplier, notes: e.target.value })
              }
              className="px-3 py-2 border rounded text-sm col-span-2"
            />
            <button
              onClick={addSupplier}
              className="col-span-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {suppliers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No hay proveedores</p>
        ) : (
          suppliers.map((supplier) => (
            <div
              key={supplier.id}
              className="p-4 border rounded hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{supplier.name}</h3>
                  <p className="text-sm text-gray-600">ID: {supplier.id}</p>

                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    {supplier.contact_email && (
                      <p>
                        <span className="text-gray-600">Email:</span>{" "}
                        <a
                          href={`mailto:${supplier.contact_email}`}
                          className="text-blue-600 hover:underline"
                        >
                          {supplier.contact_email}
                        </a>
                      </p>
                    )}
                    {supplier.phone && (
                      <p>
                        <span className="text-gray-600">Tel:</span>{" "}
                        <a href={`tel:${supplier.phone}`} className="text-blue-600">
                          {supplier.phone}
                        </a>
                      </p>
                    )}
                    {supplier.website && (
                      <p>
                        <span className="text-gray-600">Web:</span>{" "}
                        <a
                          href={supplier.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline"
                        >
                          Visitar
                        </a>
                      </p>
                    )}
                    {supplier.notes && (
                      <p className="col-span-2">
                        <span className="text-gray-600">Notas:</span> {supplier.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="bg-blue-50 p-3 rounded">
                    <p className="text-2xl font-bold text-blue-600">
                      {supplier.supplier_products?.length || 0}
                    </p>
                    <p className="text-xs text-gray-600">productos</p>
                  </div>

                  <Link
                    href={`/admin/suppliers/${supplier.id}`}
                    className="mt-2 inline-block px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                  >
                    Ver Productos
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
