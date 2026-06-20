"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Users, Clock } from "lucide-react";
import { ReservasNav } from "@/components/reservas/ReservasNav";
import { syncAndLoadReservas } from "@/lib/reservas/sync";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  getMesasConEstado,
  loadReservas,
  createWalkInForMesa,
  sentarReserva,
  liberarMesa,
  type MesaConEstado,
  type MesaLocal,
  type ReservaLocal,
  type ServicioLocal,
} from "@/lib/reservas/local-store";

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_STYLE = {
  available: { bg: "bg-white",        border: "border-gray-200",   badge: "bg-gray-100 text-gray-500",    label: "Libre"      },
  reserved:  { bg: "bg-emerald-50",   border: "border-emerald-400", badge: "bg-emerald-100 text-emerald-700", label: "Reservada"  },
  occupied:  { bg: "bg-red-50",       border: "border-red-400",    badge: "bg-red-100 text-red-700",      label: "Ocupada"    },
  cleaning:  { bg: "bg-yellow-50",    border: "border-yellow-400", badge: "bg-yellow-100 text-yellow-700", label: "Limpieza"   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function hoy() { return new Date().toISOString().split("T")[0]; }
function autoServicio(): ServicioLocal { return new Date().getHours() >= 15 ? "cena" : "comida"; }

function duracion(seatedAt?: string): string {
  if (!seatedAt) return "";
  const mins = Math.floor((Date.now() - new Date(seatedAt).getTime()) / 60_000);
  if (mins < 60) return `${mins} min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

// ─── Modal shell ──────────────────────────────────────────────────────────────

function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center"
         onClick={onClose}>
      <div className="w-full max-w-sm rounded-t-2xl bg-white p-6 shadow-2xl sm:rounded-2xl"
           onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

// ─── Mesa picker ──────────────────────────────────────────────────────────────

function MesaPicker({
  mesas, selectedIds, onToggle,
}: { mesas: MesaLocal[]; selectedIds: string[]; onToggle: (id: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {mesas.map((m) => {
        const sel = selectedIds.includes(m.id);
        return (
          <button key={m.id} onClick={() => onToggle(m.id)}
            className={`rounded-lg border-2 px-2 py-1.5 text-center transition-colors ${
              sel ? "border-karuma-600 bg-karuma-50 text-karuma-700 font-bold"
                  : "border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-400"
            }`}>
            <p className="text-xs font-bold">T{m.numero}</p>
            <p className="text-[10px] text-gray-500">{m.capacidad}p</p>
          </button>
        );
      })}
    </div>
  );
}

const inp = "w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm focus:border-karuma-500 focus:outline-none";

// ─── Main component ───────────────────────────────────────────────────────────

export default function MesaViewPage() {
  const [fecha, setFecha] = useState(hoy);
  const [servicio, setServicio] = useState<ServicioLocal>(autoServicio);
  const [mesas, setMesas] = useState<MesaConEstado[]>([]);
  const [tick, setTick] = useState(0);
  const [toast, setToast] = useState("");

  const [sel, setSel] = useState<MesaConEstado | null>(null);

  const [wiMesa, setWiMesa] = useState<MesaConEstado | null>(null);
  const [wiPersonas, setWiPersonas] = useState(2);
  const [wiNombre, setWiNombre] = useState("");
  const [wiTelefono, setWiTelefono] = useState("");
  const [wiNotas, setWiNotas] = useState("");
  const [wiError, setWiError] = useState("");
  const [wiOk, setWiOk] = useState<{ mesaId: string; personas: number; seatedAt: string } | null>(null);

  const [seatReserva, setSeatReserva] = useState<ReservaLocal | null>(null);
  const [seatMesaIds, setSeatMesaIds] = useState<string[]>([]);
  const [seatError, setSeatError] = useState("");

  // ── Load: sync Supabase → localStorage, then compute mesa status ─────────
  const reload = useCallback(() => {
    syncAndLoadReservas(fecha).then(() => {
      setMesas(getMesasConEstado(fecha, servicio));
    }).catch(() => {
      setMesas(getMesasConEstado(fecha, servicio));
    });
  }, [fecha, servicio]);

  useEffect(() => { reload(); }, [reload]);

  // ── Realtime: auto-refresh when any reservation changes ──────────────────
  useEffect(() => {
    const sb = getSupabaseClient();
    if (!sb) return;
    const ch = sb.channel("mesa_view_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "reservas" }, () => reload())
      .subscribe();
    return () => { void ch.unsubscribe(); };
  }, [reload]);

  // Auto-refresh every 60s
  useEffect(() => {
    const id = setInterval(() => { setTick((t) => t + 1); reload(); }, 60_000);
    return () => clearInterval(id);
  }, [reload]);

  void tick;

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  const total    = mesas.length;
  const ocupadas = mesas.filter((m) => m.status === "occupied").length;
  const reservadas = mesas.filter((m) => m.status === "reserved").length;
  const libres   = mesas.filter((m) => m.status === "available").length;

  function openWalkIn(m: MesaConEstado) {
    setWiMesa(m); setWiPersonas(m.capacidad); setWiNombre(""); setWiTelefono("");
    setWiNotas(""); setWiError(""); setWiOk(null);
  }

  function submitWalkIn() {
    if (!wiMesa) return;
    setWiError("");
    const res = createWalkInForMesa(wiMesa.id, wiPersonas, wiNombre, wiTelefono, wiNotas);
    if (!res.ok) { setWiError(res.error); return; }
    setWiOk({ mesaId: wiMesa.id, personas: wiPersonas, seatedAt: new Date().toISOString() });
    reload();
    showToast(`${wiMesa.id} — Walk-In registrado`);
  }

  function closeWalkIn() {
    setWiMesa(null); setWiOk(null); setWiError("");
    setWiNombre(""); setWiTelefono(""); setWiNotas(""); setWiPersonas(2);
  }

  function handleLiberar(reservaId: string) {
    const reserva = sel?.reserva;
    liberarMesa(reservaId);
    if (reserva?.origen === "online") {
      void fetch("/api/reservas/actualizar-estado", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: reservaId, estado: "finished" }),
      });
    }
    setSel(null);
    reload();
    showToast("Mesa liberada");
  }

  function openSeat(r: ReservaLocal) {
    setSeatReserva(r);
    setSeatMesaIds(r.mesaIds.length ? r.mesaIds : []);
    setSeatError("");
  }

  function submitSeat() {
    if (!seatReserva) return;
    setSeatError("");
    const res = sentarReserva(seatReserva.id, seatMesaIds.length ? seatMesaIds : undefined);
    if (!res.ok) { setSeatError(res.error); return; }
    setSeatReserva(null); setSel(null);
    reload();
    showToast("Mesa ocupada");
  }

  function toggleSeatMesa(id: string) {
    setSeatMesaIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function handleMesaClick(m: MesaConEstado) {
    if (m.status === "available") { openWalkIn(m); return; }
    setSel(m);
  }

  const mesasList: MesaLocal[] = mesas.map(({ id, numero, capacidad, zona }) => ({ id, numero, capacidad, zona }));

  return (
    <div className="min-h-dvh p-4 text-gray-900 md:p-6">
      <div className="mx-auto max-w-4xl">
        <ReservasNav />

        {/* Top bar */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm" />
          <div className="flex overflow-hidden rounded-lg border border-gray-300">
            {(["comida", "cena"] as const).map((s) => (
              <button key={s} onClick={() => setServicio(s)}
                className={`px-5 py-2 text-sm font-medium transition-colors ${
                  servicio === s ? "bg-karuma-600 text-white" : "bg-white text-gray-500 hover:bg-gray-50"
                }`}>
                {s === "comida" ? "🍱 Comida" : "🍣 Cena"}
              </button>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="mb-5 grid grid-cols-4 gap-2">
          {[
            { label: "Total",     val: total,     cls: "text-gray-900" },
            { label: "Ocupadas",  val: ocupadas,  cls: "text-red-600"  },
            { label: "Reservadas",val: reservadas, cls: "text-emerald-600" },
            { label: "Libres",    val: libres,    cls: "text-gray-500" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl border border-gray-200 bg-white p-3 text-center shadow-sm">
              <p className={`text-2xl font-bold ${s.cls}`}>{s.val}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="mb-5 flex flex-wrap gap-3 text-xs">
          {(Object.entries(STATUS_STYLE) as [keyof typeof STATUS_STYLE, typeof STATUS_STYLE[keyof typeof STATUS_STYLE]][]).map(([key, s]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span className={`h-3 w-3 rounded-sm border-2 ${s.bg} ${s.border}`} />
              <span className="text-gray-500">{s.label}</span>
            </span>
          ))}
          <span className="text-gray-400">· Toca una mesa libre para Walk-In</span>
        </div>

        {/* Mesa grid */}
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
          {mesas.map((m) => {
            const st = STATUS_STYLE[m.status];
            const r = m.reserva;
            return (
              <button key={m.id} onClick={() => handleMesaClick(m)}
                className={`relative rounded-xl border-2 p-3 text-left transition-all hover:shadow-md active:scale-95 ${st.bg} ${st.border}`}>
                <span className={`absolute right-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold ${st.badge}`}>
                  {st.label}
                </span>
                <p className="text-lg font-black text-gray-900">T{m.numero}</p>
                <p className="text-[10px] text-gray-400">{m.capacidad}p · {m.zona}</p>

                {m.status === "occupied" && r && (
                  <div className="mt-1.5 space-y-0.5">
                    <p className="truncate text-xs font-semibold text-red-700">{r.nombre}</p>
                    <div className="flex items-center gap-1 text-[10px] text-red-500">
                      <Users className="h-3 w-3" />{r.personas}
                      <Clock className="ml-1 h-3 w-3" />{duracion(r.seatedAt)}
                    </div>
                  </div>
                )}
                {m.status === "reserved" && r && (
                  <div className="mt-1.5 space-y-0.5">
                    <p className="truncate text-xs font-semibold text-emerald-700">{r.nombre}</p>
                    <p className="text-[10px] text-emerald-600">{r.hora} · {r.personas}p</p>
                  </div>
                )}
                {m.status === "available" && (
                  <p className="mt-1.5 text-[10px] text-gray-400">Tap → Walk-In</p>
                )}
              </button>
            );
          })}
        </div>

        {ocupadas > 0 && (
          <div className="mt-5 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm shadow-sm">
            <span className="font-bold text-gray-900">{mesas.filter((m) => m.status === "occupied").reduce((s, m) => s + (m.reserva?.personas ?? 0), 0)}</span>
            {" "}personas sentadas ahora ·{" "}
            <span className="font-bold text-red-600">{ocupadas}</span> mesas ocupadas
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}

      {/* Detail modal */}
      <Modal open={!!sel} onClose={() => setSel(null)}>
        {sel && (
          <div className="space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900">T{sel.numero}</h2>
                <p className="text-sm text-gray-500">{sel.capacidad} personas · {sel.zona}</p>
              </div>
              <button onClick={() => setSel(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            {sel.status === "occupied" && sel.reserva && (
              <>
                <div className="rounded-xl bg-red-50 p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Cliente</span><span className="font-semibold">{sel.reserva.nombre}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Personas</span><span className="font-semibold">{sel.reserva.personas}</span></div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Entrada</span>
                    <span className="font-semibold">
                      {sel.reserva.seatedAt
                        ? new Date(sel.reserva.seatedAt).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
                        : sel.reserva.hora}
                    </span>
                  </div>
                  <div className="flex justify-between"><span className="text-gray-500">Tiempo</span><span className="font-bold text-red-600">{duracion(sel.reserva.seatedAt)}</span></div>
                  {sel.reserva.notas && (
                    <div className="flex justify-between"><span className="text-gray-500">Notas</span><span className="text-right max-w-[60%] text-gray-700">{sel.reserva.notas}</span></div>
                  )}
                </div>
                <button onClick={() => handleLiberar(sel.reserva!.id)}
                  className="w-full rounded-xl bg-gray-900 py-3 font-bold text-white hover:bg-gray-700">
                  ✓ Liberar mesa
                </button>
              </>
            )}

            {sel.status === "reserved" && sel.reserva && (
              <>
                <div className="rounded-xl bg-emerald-50 p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-gray-500">Cliente</span><span className="font-semibold">{sel.reserva.nombre}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Hora</span><span className="font-semibold">{sel.reserva.hora}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Personas</span><span className="font-semibold">{sel.reserva.personas}</span></div>
                  {sel.reserva.telefono && (
                    <div className="flex justify-between"><span className="text-gray-500">Tel.</span><span>{sel.reserva.telefono}</span></div>
                  )}
                </div>
                <button onClick={() => { openSeat(sel.reserva!); setSel(null); }}
                  className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white hover:bg-karuma-700">
                  → Sentar / Ocupar mesa
                </button>
              </>
            )}
          </div>
        )}
      </Modal>

      {/* Walk-In para mesa específica */}
      <Modal open={!!wiMesa} onClose={closeWalkIn}>
        {wiMesa && (
          wiOk ? (
            <div className="space-y-4">
              <div className="rounded-xl bg-red-50 p-4 text-center">
                <p className="text-4xl font-black text-red-700">T{wiMesa.numero}</p>
                <p className="mt-1 font-bold text-red-600">Mesa ocupada</p>
                <p className="text-sm text-gray-500">{wiOk.personas} personas · {duracion(wiOk.seatedAt)}</p>
              </div>
              <button onClick={closeWalkIn} className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white">Cerrar</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-black text-gray-900">T{wiMesa.numero}</h2>
                  <p className="text-sm text-gray-500">Walk-In · {wiMesa.capacidad} pax máx · {wiMesa.zona}</p>
                </div>
                <button onClick={closeWalkIn} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
              </div>
              {wiError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{wiError}</p>}
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Personas <span className="text-red-400">*</span></label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setWiPersonas(Math.max(1, wiPersonas - 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl font-bold hover:bg-gray-200">−</button>
                  <span className="flex-1 text-center text-4xl font-black">{wiPersonas}</span>
                  <button onClick={() => setWiPersonas(Math.min(wiMesa.capacidad * 2, wiPersonas + 1))}
                    className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-100 text-xl font-bold hover:bg-gray-200">+</button>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Nombre (opcional)</label>
                <input className={inp} placeholder="Walk-In" value={wiNombre} onChange={(e) => setWiNombre(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Teléfono (opcional)</label>
                <input className={inp} type="tel" placeholder="+34…" value={wiTelefono} onChange={(e) => setWiTelefono(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-gray-400">Notas</label>
                <textarea className={inp} rows={2} value={wiNotas} onChange={(e) => setWiNotas(e.target.value)} />
              </div>
              <button onClick={() => submitWalkIn()}
                className="w-full rounded-xl bg-red-600 py-3.5 text-base font-black text-white hover:bg-red-500">
                Ocupar T{wiMesa.numero} ahora
              </button>
            </div>
          )
        )}
      </Modal>

      {/* Seat modal */}
      <Modal open={!!seatReserva} onClose={() => setSeatReserva(null)}>
        {seatReserva && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black text-gray-900">Sentar reserva</h2>
                <p className="text-sm text-gray-500">{seatReserva.nombre} · {seatReserva.personas} personas</p>
              </div>
              <button onClick={() => setSeatReserva(null)} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>
            {seatError && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">{seatError}</p>}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
                Selecciona mesa(s) — puedes elegir varias para grupos
              </p>
              <MesaPicker mesas={mesasList} selectedIds={seatMesaIds} onToggle={toggleSeatMesa} />
              {seatMesaIds.length === 0 && (
                <p className="mt-1.5 text-xs text-gray-400">Sin selección = asignación automática</p>
              )}
            </div>
            <button onClick={() => submitSeat()}
              className="w-full rounded-xl bg-karuma-600 py-3 font-bold text-white hover:bg-karuma-700">
              {seatMesaIds.length ? `Sentar en ${seatMesaIds.join(", ")}` : "Sentar (auto-asignar mesa)"}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
