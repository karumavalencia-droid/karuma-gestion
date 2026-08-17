"use client";

import { useEffect, useState } from "react";

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  department: string;
  is_active: boolean;
  last_login: string;
}

const ROLES = [
  { value: "admin", label: "Administrador", color: "red" },
  { value: "manager", label: "Gerente", color: "orange" },
  { value: "buyer", label: "Comprador", color: "blue" },
  { value: "viewer", label: "Espectador", color: "gray" },
];

export function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    role: "buyer",
    department: "",
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/users");
      const data = await res.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        const data = await res.json() as { user?: User };
        if (data.user) setUsers((current) => [data.user!, ...current]);
        setFormData({ email: "", full_name: "", role: "buyer", department: "" });
        setShowForm(false);
      }
    } catch (error) {
      console.error("Error creating user:", error);
    }
  };

  const updateUser = async (userId: number, updates: Partial<User>) => {
    const previous = users;
    setUsers((current) =>
      current.map((user) => user.id === userId ? { ...user, ...updates } : user),
    );
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      if (!res.ok) throw new Error("No se pudo actualizar el usuario");
    } catch (error) {
      setUsers(previous);
      console.error("Error updating user:", error);
    }
  };

  const deleteUser = async (userId: number) => {
    if (confirm("¿Desactivar este usuario?")) {
      const previous = users;
      setUsers((current) => current.filter((user) => user.id !== userId));
      try {
        const res = await fetch(`/api/users/${userId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("No se pudo desactivar el usuario");
      } catch (error) {
        setUsers(previous);
        console.error("Error deleting user:", error);
      }
    }
  };

  const getRoleColor = (role: string) => {
    const roleConfig = ROLES.find((r) => r.value === role);
    const colorMap: Record<string, string> = {
      red: "bg-red-100 text-red-800",
      orange: "bg-orange-100 text-orange-800",
      blue: "bg-blue-100 text-blue-800",
      gray: "bg-gray-100 text-gray-800",
    };
    return colorMap[roleConfig?.color || "gray"];
  };

  if (loading) return <div>Cargando usuarios...</div>;

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">👥 Gestión de Usuarios</h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          + Nuevo Usuario
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <h3 className="font-bold mb-4">Crear Nuevo Usuario</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  placeholder="usuario@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Rol</label>
                <select
                  value={formData.role}
                  onChange={(e) =>
                    setFormData({ ...formData, role: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">
                  Departamento
                </label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) =>
                    setFormData({ ...formData, department: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded"
                  placeholder="Compras"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700"
              >
                Crear Usuario
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-6 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {users.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No hay usuarios registrados
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Rol
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Departamento
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Último Acceso
                </th>
                <th className="px-6 py-3 text-left text-sm font-semibold">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-3">{user.email}</td>
                  <td className="px-6 py-3">{user.full_name}</td>
                  <td className="px-6 py-3">
                    <select
                      value={user.role}
                      onChange={(e) =>
                        updateUser(user.id, { role: e.target.value })
                      }
                      className={`px-3 py-1 rounded text-sm font-semibold ${getRoleColor(user.role)}`}
                    >
                      {ROLES.map((role) => (
                        <option key={role.value} value={role.value}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-600">
                    {user.department}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500">
                    {user.last_login
                      ? new Date(user.last_login).toLocaleDateString("es-ES")
                      : "Nunca"}
                  </td>
                  <td className="px-6 py-3">
                    <button
                      onClick={() => deleteUser(user.id)}
                      className="text-red-600 hover:text-red-800 text-sm font-semibold"
                    >
                      Desactivar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Leyenda de roles */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-bold mb-3">📋 Descripción de Roles</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {ROLES.map((role) => (
            <div key={role.value} className="text-sm">
              <span className={`px-2 py-1 rounded font-semibold ${getRoleColor(role.value)}`}>
                {role.label}
              </span>
              <p className="text-gray-600 mt-2 text-xs">
                {role.value === "admin" && "Acceso total al sistema"}
                {role.value === "manager" && "Ver todo, aprobar órdenes"}
                {role.value === "buyer" && "Crear y ver órdenes"}
                {role.value === "viewer" && "Solo lectura"}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
