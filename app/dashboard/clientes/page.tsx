"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { ClienteReserva } from "@/lib/reservas/types";
import { Star, Ban, Search, X, ChevronRight } from "lucide-react";
import { ReservasNav } from "@/components/reservas/ReservasNav";

interface ReservaHistorial {
  id: string;
  fecha: string;
  hora_inicio: string;
  personas: number;
  servicio: string;
  estado: string;
  mesa_ids: number[];
  notas: string | null;
}

const ESTADO_COLOR: Record<string, string> = {
  Confirmada: "text-emerald-400",
  Sentado: "text-red-400",
  Finalizada: "text-gray-400",
  Cancelada: "text-gray-600",
  NoShow: "text-yellow-400",
  WalkIn: "text-pink-400",
};

export default function ClientesReservasPage() {
  const [clientes, setClientes] = useState<ClienteReserva[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [seleccionado, setSeleccionado] = useState<ClienteReserva | null>(null);
  const [historial, setHistorial] = useState<ReservaHistorial[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [editNotas, setEditNotas] = useState("");
  const [guardandoNotas, setGuardandoNotas] = useState(false);

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

  async function abrirCliente(c: ClienteReserva) {
    setSeleccionado(c);
    setEditNotas(c.notas ?? "");
    setLoadingHistorial(true);
    setHistorial([]);
    const sb = getSupabaseClient();
    if (!sb) { setLoadingHistorial(false); return; }
    const { data } = await sb
      .from("reservas")
      .select("id, fecha, hora_inicio, personas, servicio, estado, mesa_ids, notas")
      .eq("cliente_id", c.id)
      .order("fecha", { ascending: false })
      .limit(20);
    setHistorial((data ?? []) as ReservaHistorial[]);
    setLoadingHistorial(false);
  }

  async function toggleVip(id: string, vip: boolean) {
    const sb = getSupabaseClient();
    if (!sb) return;
    await sb.from("clientes_reservas").update({ vip: !vip }).eq("id", id);
    setSeleccionado((p) => p?.id === id ? { ...p, vip: !vip } : p);
    cargar();
  }

  async function toggleBloqueado(id: string, bloqueado: boolean) {
    const sb = getSupabaseClient();
    if (!sb) return;
    await sb.from("clientes_reservas").update({ bloqueado: !bloqueado }).eq("id", id);
    setSeleccionado((p) => p?.id === id ? { ...p, bloqueado: !bloqueado } : p);
    cargar();
  }

  async function guardarNotas() {
    if (!seleccionado) return;
    setGuardandoNotas(true);
    const sb = getSupabaseClient();
    if (!sb) { setGuardandoNotas(false); return; }
    await sb.from("clientes_reservas").update({ notas: editNotas || null }).eq("id", seleccionado.id);
    setSeleccionado((p) => p ? { ...p, notas: editNotas || null } : p);
    setGuardandoNotas(false);
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
                  <th className="px-4 py-3 text-center">VIP / Bloq.</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtrados.map((c) => (
                  <tr
                    key={c.id}
                    className={`cursor-pointer bg-gray-900 hover:bg-gray-800 ${c.bloqueado ? "opacity-50" : ""}`}
                    onClick={() => abrirCliente(c)}
                  >
                    <td className="px-4 py-3 font-medium">
                      {c.nombre}
                      {c.vip && <span className="ml-1.5 text-yellow-400">★</span>}
                      {c.bloqueado && <span className="ml-1.5 text-red-400">🚫</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400">{c.telefono}</td>
                    <td className="px-4 py-3 text-center font-semibold">{c.visitas}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={c.no_shows > 0 ? "font-semibold text-red-400" : "text-gray-500"}>
                        {c.no_shows}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400">{c.ultima_visita ?? "—"}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-center gap-2">
                        <button
                          onClick={() => toggleVip(c.id, c.vip)}
                          className={`rounded p-1.5 ${c.vip ? "bg-yellow-900 text-yellow-300" : "bg-gray-800 text-gray-500"}`}
                        >
                          <Star className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => toggleBloqueado(c.id, c.bloqueado)}
                          className={`rounded p-1.5 ${c.bloqueado ? "bg-red-900 text-red-300" : "bg-gray-800 text-gray-500"}`}
                        >
                          <Ban className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-gray-600">
                      <ChevronRight className="h-4 w-4" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Panel lateral de historial */}
      {seleccionado && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60"
          onClick={() => setSeleccionado(null)}
        >
          <div
            className="flex h-full w-full max-w-md flex-col overflow-y-auto bg-gray-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera */}
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {seleccionado.nombre}
                  {seleccionado.vip && <span className="ml-2 text-yellow-400">★ VIP</span>}
                </h2>
                <p className="mt-0.5 text-sm text-gray-400">{seleccionado.telefono}</p>
              </div>
              <button
                onClick={() => setSeleccionado(null)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Stats */}
            <div className="mb-5 grid grid-cols-3 gap-3">
              <div className="rounded-xl bg-gray-800 p-3 text-center">
                <p className="text-2xl font-bold text-white">{seleccionado.visitas}</p>
                <p className="text-xs text-gray-400">Visitas</p>
              </div>
              <div className="rounded-xl bg-gray-800 p-3 text-center">
                <p className={`text-2xl font-bold ${seleccionado.no_shows > 0 ? "text-red-400" : "text-white"}`}>
                  {seleccionado.no_shows}
                </p>
                <p className="text-xs text-gray-400">No Shows</p>
              </div>
              <div className="rounded-xl bg-gray-800 p-3 text-center">
                <p className="text-sm font-semibold text-white leading-tight mt-1">
                  {seleccionado.ultima_visita ?? "—"}
                </p>
                <p className="text-xs text-gray-400">Última visita</p>
              </div>
            </div>

            {/* Acciones */}
            <div className="mb-5 flex gap-2">
              <button
                onClick={() => toggleVip(seleccionado.id, seleccionado.vip)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                  seleccionado.vip
                    ? "bg-yellow-900 text-yellow-300 hover:bg-yellow-800"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                <Star className="h-4 w-4" />
                {seleccionado.vip ? "Quitar VIP" : "Marcar VIP"}
              </button>
              <button
                onClick={() => toggleBloqueado(seleccionado.id, seleccionado.bloqueado)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors ${
                  seleccionado.bloqueado
                    ? "bg-red-900 text-red-300 hover:bg-red-800"
                    : "bg-gray-800 text-gray-400 hover:bg-gray-700"
                }`}
              >
                <Ban className="h-4 w-4" />
                {seleccionado.bloqueado ? "Desbloquear" : "Bloquear"}
              </button>
            </div>

            {/* Notas internas */}
            <div className="mb-5">
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-gray-400">
                Notas internas
              </label>
              <textarea
                value={editNotas}
                onChange={(e) => setEditNotas(e.target.value)}
                rows={3}
                placeholder="Preferencias, alergias, celebraciones…"
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm focus:border-karuma-600 focus:outline-none"
              />
              <button
                onClick={guardarNotas}
                disabled={guardandoNotas || editNotas === (seleccionado.notas ?? "")}
                className="mt-2 w-full rounded-xl bg-karuma-600 py-2 text-sm font-semibold text-white disabled:opacity-40 hover:bg-karuma-700"
              >
                {guardandoNotas ? "Guardando…" : "Guardar notas"}
              </button>
            </div>

            {/* Historial */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Historial de reservas
              </h3>
              {loadingHistorial ? (
                <div className="flex justify-center py-6">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-700 border-t-karuma-600" />
                </div>
              ) : historial.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-600">Sin reservas anteriores</p>
              ) : (
                <div className="space-y-2">
                  {historial.map((r) => (
                    <div key={r.id} className="rounded-xl bg-gray-800 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-200">
                          {r.fecha} · {r.hora_inicio.slice(0, 5)}
                        </p>
                        <span className={`text-xs font-medium ${ESTADO_COLOR[r.estado] ?? "text-gray-400"}`}>
                          {r.estado}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {r.personas} personas · {r.servicio}
                        {r.mesa_ids.length > 0 && ` · Mesa ${r.mesa_ids.join(", ")}`}
                      </p>
                      {r.notas && <p className="mt-1 text-xs text-gray-600 italic">{r.notas}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
