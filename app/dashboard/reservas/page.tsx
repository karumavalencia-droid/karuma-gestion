"use client";

import { useState, useEffect, useCallback } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Reserva, EstadoReserva } from "@/lib/reservas/types";
import { MessageCircle, Plus, Search } from "lucide-react";
import { ReservasNav } from "@/components/reservas/ReservasNav";

const ESTADO_COLORES: Record<EstadoReserva, string> = {
  Confirmada: "bg-emerald-900/40 text-emerald-300",
  Sentado: "bg-red-900/40 text-red-300",
  Finalizada: "bg-gray-700 text-gray-400",
  Cancelada: "bg-gray-800 text-gray-500",
  NoShow: "bg-yellow-900/40 text-yellow-300",
  WalkIn: "bg-pink-900/40 text-pink-300",
};

export default function GestionReservasPage() {
  const [reservas, setReservas] = useState<(Reserva & { cliente_nombre?: string; cliente_telefono?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [servicio, setServicio] = useState<"" | "comida" | "cena">("");
  const [busqueda, setBusqueda] = useState("");
  const [showWalkIn, setShowWalkIn] = useState(false);
  const [wiNombre, setWiNombre] = useState("");
  const [wiTelefono, setWiTelefono] = useState("");
  const [wiPersonas, setWiPersonas] = useState(2);
  const [wiNotas, setWiNotas] = useState("");

  const cargar = useCallback(async () => {
    setLoading(true);
    const sb = getSupabaseClient();
    if (!sb) { setLoading(false); return; }
    let q = sb
      .from("reservas")
      .select("*, cliente:clientes_reservas(nombre, telefono)")
      .eq("fecha", fecha)
      .order("hora_inicio");
    if (servicio) q = q.eq("servicio", servicio);
    const { data } = await q;
    setReservas(
      (data ?? []).map((r: Record<string, unknown>) => ({
        ...(r as unknown as Reserva),
        cliente_nombre: (r.cliente as { nombre?: string } | null)?.nombre ?? "—",
        cliente_telefono: (r.cliente as { telefono?: string } | null)?.telefono ?? "",
      })),
    );
    setLoading(false);
  }, [fecha, servicio]);

  useEffect(() => { cargar(); }, [cargar]);

  async function cambiarEstado(id: string, estado: EstadoReserva) {
    const sb = getSupabaseClient();
    if (!sb) return;
    await sb.from("reservas").update({ estado }).eq("id", id);
    cargar();
  }

  async function crearWalkIn() {
    const sb = getSupabaseClient();
    if (!sb) return;
    const hora = new Date().toTimeString().slice(0, 5);
    const serv: "comida" | "cena" = hora < "17:00" ? "comida" : "cena";
    const { data: cli } = await sb
      .from("clientes_reservas")
      .upsert({ nombre: wiNombre, telefono: wiTelefono, visitas: 1 }, { onConflict: "telefono" })
      .select("id")
      .single();
    if (!cli) return;
    await sb.from("reservas").insert({
      cliente_id: cli.id,
      fecha,
      hora_inicio: hora,
      duracion_min: wiPersonas <= 2 ? 90 : 120,
      servicio: serv,
      personas: wiPersonas,
      mesa_ids: [],
      estado: "WalkIn",
      notas: wiNotas || null,
      origen: "walkin",
    });
    setShowWalkIn(false);
    setWiNombre(""); setWiTelefono(""); setWiPersonas(2); setWiNotas("");
    cargar();
  }

  const filtradas = reservas.filter((r) => {
    if (!busqueda) return true;
    const q = busqueda.toLowerCase();
    return (
      (r.cliente_nombre ?? "").toLowerCase().includes(q) ||
      (r.cliente_telefono ?? "").includes(q)
    );
  });

  return (
    <div className="-m-3 min-h-[calc(100dvh)] bg-gray-950 p-4 text-gray-100 sm:-m-4 md:-m-6 md:p-6">
      <div className="mx-auto max-w-5xl">
        <ReservasNav />
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-bold">Gestión de Reservas</h1>
          <button
            onClick={() => setShowWalkIn(true)}
            className="flex items-center gap-2 rounded-lg bg-karuma-600 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> Walk-In
          </button>
        </div>

        {/* Filtros */}
        <div className="mb-4 flex flex-wrap gap-3">
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
          />
          <select
            value={servicio}
            onChange={(e) => setServicio(e.target.value as "" | "comida" | "cena")}
            className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
          >
            <option value="">Todos los servicios</option>
            <option value="comida">Comida</option>
            <option value="cena">Cena</option>
          </select>
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

        {/* Tabla */}
        {loading ? (
          <p className="text-center text-gray-500">Cargando…</p>
        ) : filtradas.length === 0 ? (
          <p className="text-center text-gray-500">No hay reservas para este filtro.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-800">
            <table className="w-full text-sm">
              <thead className="bg-gray-900 text-xs uppercase text-gray-400">
                <tr>
                  <th className="px-4 py-3 text-left">Cliente</th>
                  <th className="px-4 py-3 text-left">Teléfono</th>
                  <th className="px-4 py-3 text-left">Hora</th>
                  <th className="px-4 py-3 text-center">Pers.</th>
                  <th className="px-4 py-3 text-left">Mesas</th>
                  <th className="px-4 py-3 text-left">Notas</th>
                  <th className="px-4 py-3 text-left">Estado</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {filtradas.map((r) => (
                  <tr key={r.id} className="bg-gray-900 hover:bg-gray-800">
                    <td className="px-4 py-3 font-medium">{r.cliente_nombre}</td>
                    <td className="px-4 py-3 text-gray-400">{r.cliente_telefono}</td>
                    <td className="px-4 py-3">{r.hora_inicio.slice(0, 5)}</td>
                    <td className="px-4 py-3 text-center">{r.personas}</td>
                    <td className="px-4 py-3 text-gray-400">
                      {r.mesa_ids.length ? r.mesa_ids.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 max-w-[120px] truncate">{r.notas ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ESTADO_COLORES[r.estado]}`}>
                        {r.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {r.cliente_telefono && (
                          <a
                            href={`https://wa.me/${r.cliente_telefono.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded bg-emerald-800 p-1.5 text-emerald-300 hover:bg-emerald-700"
                            title="WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        )}
                        {r.estado === "Confirmada" && (
                          <button
                            onClick={() => cambiarEstado(r.id, "Sentado")}
                            className="rounded bg-red-900 px-2 py-1 text-xs text-red-300 hover:bg-red-800"
                          >
                            Sentar
                          </button>
                        )}
                        {r.estado === "Sentado" && (
                          <button
                            onClick={() => cambiarEstado(r.id, "Finalizada")}
                            className="rounded bg-gray-700 px-2 py-1 text-xs text-gray-300 hover:bg-gray-600"
                          >
                            Finalizar
                          </button>
                        )}
                        {(r.estado === "Confirmada" || r.estado === "WalkIn") && (
                          <button
                            onClick={() => cambiarEstado(r.id, "NoShow")}
                            className="rounded bg-yellow-900 px-2 py-1 text-xs text-yellow-300 hover:bg-yellow-800"
                          >
                            No Show
                          </button>
                        )}
                        {r.estado !== "Cancelada" && r.estado !== "Finalizada" && (
                          <button
                            onClick={() => cambiarEstado(r.id, "Cancelada")}
                            className="rounded bg-gray-800 px-2 py-1 text-xs text-gray-400 hover:bg-gray-700"
                          >
                            Cancelar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Walk-In */}
      {showWalkIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-gray-900 p-6">
            <h2 className="mb-4 text-lg font-bold">Nuevo Walk-In</h2>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Nombre"
                value={wiNombre}
                onChange={(e) => setWiNombre(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
              />
              <input
                type="tel"
                placeholder="Teléfono"
                value={wiTelefono}
                onChange={(e) => setWiTelefono(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
              />
              <div className="flex items-center gap-3">
                <label className="text-sm text-gray-400">Personas:</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={wiPersonas}
                  onChange={(e) => setWiPersonas(Number(e.target.value))}
                  className="w-20 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
                />
              </div>
              <input
                type="text"
                placeholder="Notas (opcional)"
                value={wiNotas}
                onChange={(e) => setWiNotas(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm"
              />
            </div>
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => setShowWalkIn(false)}
                className="flex-1 rounded-lg border border-gray-700 py-2 text-sm text-gray-400"
              >
                Cancelar
              </button>
              <button
                onClick={crearWalkIn}
                disabled={!wiNombre || !wiTelefono}
                className="flex-1 rounded-lg bg-karuma-600 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Registrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
