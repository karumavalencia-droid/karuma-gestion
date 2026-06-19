"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { ClienteReserva } from "@/lib/reservas/types";
import { Star, Ban, Search } from "lucide-react";
import { ReservasNav } from "@/components/reservas/ReservasNav";

export default function ClientesReservasPage() {
  const [clientes, setClientes] = useState<ClienteReserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    const sb = getSupabaseClient();
    if (!sb) { setLoading(false); return; }
    const { data } = await sb
      .from("clientes_reservas")
      .select("*")
      .order("visitas", { ascending: false });
    setClientes((data ?? []) as ClienteReserva[]);
    setLoading(false);
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  async function toggleVip(id: string, vip: boolean) {
    const sb = getSupabaseClient();
    if (!sb) return;
    await sb.from("clientes_reservas").update({ vip: !vip }).eq("id", id);
    cargar();
  }

  async function toggleBloqueado(id: string, bloqueado: boolean) {
    const sb = getSupabaseClient();
    if (!sb) return;
    await sb.from("clientes_reservas").update({ bloqueado: !bloqueado }).eq("id", id);
    cargar();
  }

  const filtrados = clientes.filter((c) => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return c.nombre.toLowerCase().includes(q) || c.telefono.includes(q);
  });

  return (
    <div className="-m-3 min-h-[calc(100dvh)] bg-gray-950 p-4 text-gray-100 sm:-m-4 md:-m-6 md:p-6">
      <div className="mx-auto max-w-5xl">
        <ReservasNav />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">Base de Clientes</h1>
          <div className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar nombre o teléfono…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="bg-transparent text-sm focus:outline-none"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-center text-gray-500">Cargando…</p>
        ) : filtrados.length === 0 ? (
          <p className="text-center text-gray-500">No hay clientes aún.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Nombre</th>
                  <th className="px-4 py-3 text-left">Teléfono</th>
                  <th className="px-4 py-3 text-center">Visitas</th>
                  <th className="px-4 py-3 text-center">No Shows</th>
                  <th className="px-4 py-3 text-left">Última visita</th>
                  <th className="px-4 py-3 text-left">Notas</th>
                  <th className="px-4 py-3 text-center">VIP / Bloq.</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtrados.map((c) => (
                  <tr key={c.id} className={`bg-gray-900 hover:bg-gray-800 ${c.bloqueado ? "opacity-50" : ""}`}>
                    <td className="px-4 py-3 font-medium">
                      {c.nombre}
                      {c.vip && <span className="ml-1.5 text-yellow-400">★</span>}
                      {c.bloqueado && <span className="ml-1.5 text-red-400">🚫</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{c.telefono}</td>
                    <td className="px-4 py-3 text-center font-semibold">{c.visitas}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={c.no_shows > 0 ? "text-red-400 font-semibold" : "text-gray-500"}>
                        {c.no_shows}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{c.ultima_visita ?? "—"}</td>
                    <td className="px-4 py-3 text-gray-400 max-w-[120px] truncate">{c.notas ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => toggleVip(c.id, c.vip)}
                          title="Toggle VIP"
                          className={`rounded p-1.5 ${c.vip ? "bg-yellow-900 text-yellow-300" : "bg-gray-800 text-gray-500"}`}
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => toggleBloqueado(c.id, c.bloqueado)}
                          title="Toggle bloqueado"
                          className={`rounded p-1.5 ${c.bloqueado ? "bg-red-900 text-red-300" : "bg-gray-800 text-gray-500"}`}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
