"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { ReservasConfig, HorarioDia } from "@/lib/reservas/types";
import { ReservasNav } from "@/components/reservas/ReservasNav";
import { Trash2, Plus } from "lucide-react";

const DEFAULT_CONFIG: ReservasConfig = {
  reservas_online_activas: true,
  max_personas_online: 4,
  intervalo_min: 15,
  duracion_1_2_min: 90,
  duracion_3_4_min: 120,
  dias_max_antelacion: 7,
  capacidad_online_pct: 70,
  comida_inicio: "13:00",
  comida_fin: "15:30",
  cena_inicio: "20:00",
  cena_fin: "23:00",
  telefono: "",
  whatsapp: "",
  google_review_link: null,
};

const DIAS_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const DEFAULT_HORARIO: HorarioDia[] = [0, 1, 2, 3, 4, 5, 6].map((dia) => ({
  dia,
  activo: true,
  comida_activa: true,
  comida_inicio: dia === 0 || dia === 6 ? "13:00" : "13:00",
  comida_fin:    dia === 0 || dia === 6 ? "15:00" : "13:30",
  cena_activa: true,
  cena_inicio:   dia === 0 || dia === 6 ? "20:00" : "16:00",
  cena_fin:      "22:00",
}));

interface CierreRow {
  id: number;
  fecha: string;
  servicio: string;
  motivo: string | null;
}

export default function ConfigReservasPage() {
  const [config, setConfig] = useState<ReservasConfig>(DEFAULT_CONFIG);
  const [horario, setHorario] = useState<HorarioDia[]>(DEFAULT_HORARIO);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  const [cierres, setCierres] = useState<CierreRow[]>([]);
  const [cFecha, setCFecha] = useState(new Date().toISOString().split("T")[0]);
  const [cServicio, setCServicio] = useState<"comida" | "cena" | "todo">("todo");
  const [cMotivo, setCMotivo] = useState("");
  const [cGuardando, setCGuardando] = useState(false);

  const sb = getSupabaseClient();

  useEffect(() => {
    (async () => {
      if (!sb) { setLoading(false); return; }
      const [{ data: cfgData }, { data: cierresData }] = await Promise.all([
        sb.from("reservas_config").select("*").eq("id", 1).single(),
        sb.from("cierres_servicio").select("*").order("fecha", { ascending: false }).limit(30),
      ]);
      if (cfgData) setConfig(cfgData as ReservasConfig);
      setCierres((cierresData ?? []) as CierreRow[]);

      // Load per-day schedule from API
      try {
        const res = await fetch("/api/reservas/horario-semanal");
        const json = await res.json() as { horario?: HorarioDia[] };
        if (json.horario && json.horario.length === 7) setHorario(json.horario);
      } catch { /* use defaults */ }

      setLoading(false);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function guardar() {
    setGuardando(true);
    await Promise.all([
      sb ? sb.from("reservas_config").update(config).eq("id", 1) : Promise.resolve(),
      fetch("/api/reservas/horario-semanal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(horario),
      }),
    ]);
    setGuardando(false);
    setOk(true);
    setTimeout(() => setOk(false), 2000);
  }

  function setDia<K extends keyof HorarioDia>(dia: number, k: K, v: HorarioDia[K]) {
    setHorario((prev) => prev.map((d) => d.dia === dia ? { ...d, [k]: v } : d));
  }

  async function añadirCierre() {
    if (!sb || !cFecha) return;
    setCGuardando(true);
    const { data } = await sb
      .from("cierres_servicio")
      .upsert({ fecha: cFecha, servicio: cServicio, motivo: cMotivo || null }, { onConflict: "fecha,servicio" })
      .select("*").single();
    if (data) {
      setCierres((prev) => [data as CierreRow, ...prev.filter((c) => !(c.fecha === cFecha && c.servicio === cServicio))]);
    }
    setCMotivo("");
    setCGuardando(false);
  }

  async function eliminarCierre(id: number) {
    if (!sb) return;
    await sb.from("cierres_servicio").delete().eq("id", id);
    setCierres((prev) => prev.filter((c) => c.id !== id));
  }

  function set<K extends keyof ReservasConfig>(k: K, v: ReservasConfig[K]) {
    setConfig((prev) => ({ ...prev, [k]: v }));
  }

  if (loading) return <div className="p-8 text-gray-400">Cargando…</div>;

  // Order for display: L M X J V S D
  const diasOrden = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="-m-3 min-h-[calc(100dvh)] bg-gray-950 p-4 text-gray-100 sm:-m-4 md:-m-6 md:p-6">
      <div className="mx-auto max-w-2xl">
        <ReservasNav />
        <h1 className="mb-6 text-xl font-bold">Configuración de Reservas</h1>

        <div className="space-y-5">
          <Section title="General">
            <Toggle
              label="Reservas online activas"
              value={config.reservas_online_activas}
              onChange={(v) => set("reservas_online_activas", v)}
            />
            <Field label="Máx. personas online">
              <input type="number" min={1} max={20} value={config.max_personas_online}
                onChange={(e) => set("max_personas_online", Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Intervalo (min)">
              <input type="number" min={5} max={60} step={5} value={config.intervalo_min}
                onChange={(e) => set("intervalo_min", Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Duración 1–2 personas (min)">
              <input type="number" min={30} max={240} step={15} value={config.duracion_1_2_min}
                onChange={(e) => set("duracion_1_2_min", Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Duración 3–4 personas (min)">
              <input type="number" min={30} max={240} step={15} value={config.duracion_3_4_min}
                onChange={(e) => set("duracion_3_4_min", Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="Días máx. de antelación">
              <input type="number" min={1} max={90} value={config.dias_max_antelacion}
                onChange={(e) => set("dias_max_antelacion", Number(e.target.value))} className={inputCls} />
            </Field>
            <Field label="% aforo para online">
              <input type="number" min={10} max={100} step={5} value={config.capacidad_online_pct}
                onChange={(e) => set("capacidad_online_pct", Number(e.target.value))} className={inputCls} />
            </Field>
          </Section>

          {/* ── HORARIO SEMANAL ──────────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Horario semanal</h2>
            <p className="mb-4 text-xs text-gray-500">
              Define los turnos de cada día. Puedes activar/desactivar comida o cena por día.
            </p>

            <div className="space-y-3">
              {diasOrden.map((diaNum) => {
                const d = horario.find((h) => h.dia === diaNum)!;
                if (!d) return null;
                return (
                  <div key={diaNum} className={`rounded-xl border p-3 transition-opacity ${
                    d.activo ? "border-gray-700 bg-gray-800/60" : "border-gray-800 bg-gray-900 opacity-50"
                  }`}>
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                      <span className="w-10 text-sm font-bold text-gray-200">{DIAS_LABELS[diaNum]}</span>
                      <button
                        onClick={() => setDia(diaNum, "activo", !d.activo)}
                        className={`relative h-5 w-9 rounded-full transition-colors ${d.activo ? "bg-karuma-600" : "bg-gray-700"}`}
                      >
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${d.activo ? "translate-x-4" : "translate-x-0.5"}`} />
                      </button>
                    </div>

                    {d.activo && (
                      <div className="mt-3 space-y-2">
                        {/* Comida row */}
                        <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${d.comida_activa ? "bg-amber-950/40" : "bg-gray-800/40"}`}>
                          <button
                            onClick={() => setDia(diaNum, "comida_activa", !d.comida_activa)}
                            className={`relative h-4 w-8 shrink-0 rounded-full transition-colors ${d.comida_activa ? "bg-amber-500" : "bg-gray-700"}`}
                          >
                            <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${d.comida_activa ? "translate-x-4" : "translate-x-0.5"}`} />
                          </button>
                          <span className="w-14 text-xs font-medium text-amber-300">🍱 Comida</span>
                          {d.comida_activa ? (
                            <div className="flex flex-1 items-center gap-1">
                              <input type="time" value={d.comida_inicio}
                                onChange={(e) => setDia(diaNum, "comida_inicio", e.target.value)}
                                className={timeCls} />
                              <span className="text-xs text-gray-500">→</span>
                              <input type="time" value={d.comida_fin}
                                onChange={(e) => setDia(diaNum, "comida_fin", e.target.value)}
                                className={timeCls} />
                              <span className="text-[10px] text-gray-500">último pase</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600">Cerrado</span>
                          )}
                        </div>

                        {/* Cena row */}
                        <div className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${d.cena_activa ? "bg-indigo-950/40" : "bg-gray-800/40"}`}>
                          <button
                            onClick={() => setDia(diaNum, "cena_activa", !d.cena_activa)}
                            className={`relative h-4 w-8 shrink-0 rounded-full transition-colors ${d.cena_activa ? "bg-indigo-500" : "bg-gray-700"}`}
                          >
                            <span className={`absolute top-0.5 h-3 w-3 rounded-full bg-white shadow transition-transform ${d.cena_activa ? "translate-x-4" : "translate-x-0.5"}`} />
                          </button>
                          <span className="w-14 text-xs font-medium text-indigo-300">🍣 Cena</span>
                          {d.cena_activa ? (
                            <div className="flex flex-1 items-center gap-1">
                              <input type="time" value={d.cena_inicio}
                                onChange={(e) => setDia(diaNum, "cena_inicio", e.target.value)}
                                className={timeCls} />
                              <span className="text-xs text-gray-500">→</span>
                              <input type="time" value={d.cena_fin}
                                onChange={(e) => setDia(diaNum, "cena_fin", e.target.value)}
                                className={timeCls} />
                              <span className="text-[10px] text-gray-500">último pase</span>
                            </div>
                          ) : (
                            <span className="text-xs text-gray-600">Cerrado</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Section title="Contacto">
            <Field label="Teléfono">
              <input type="tel" value={config.telefono ?? ""} onChange={(e) => set("telefono", e.target.value)} className={inputCls} placeholder="+34 676 70 67 76" />
            </Field>
            <Field label="WhatsApp">
              <input type="tel" value={config.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} className={inputCls} placeholder="+34 676 70 67 76" />
            </Field>
            <Field label="Link Google Review">
              <input type="url" value={config.google_review_link ?? ""} onChange={(e) => set("google_review_link", e.target.value || null)} className={inputCls} placeholder="https://g.page/r/…" />
            </Field>
          </Section>

          {/* ── CIERRES DE SERVICIO ──────────────────────────────────────── */}
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">Cierres puntuales</h2>
            <p className="mb-4 text-xs text-gray-500">
              Para días concretos (festivos, vacaciones…). Override del horario semanal.
            </p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              <input type="date" value={cFecha} onChange={(e) => setCFecha(e.target.value)} className={`${inputCls} col-span-1`} />
              <select value={cServicio} onChange={(e) => setCServicio(e.target.value as "comida" | "cena" | "todo")} className={`${inputCls} col-span-1`}>
                <option value="todo">Todo el día</option>
                <option value="comida">Solo comida</option>
                <option value="cena">Solo cena</option>
              </select>
              <input type="text" placeholder="Motivo (opcional)" value={cMotivo} onChange={(e) => setCMotivo(e.target.value)} className={`${inputCls} col-span-2`} />
              <button onClick={añadirCierre} disabled={!cFecha || cGuardando}
                className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-karuma-600 py-2 text-sm font-semibold text-white disabled:opacity-50">
                <Plus className="h-4 w-4" />
                {cGuardando ? "Guardando…" : "Añadir cierre"}
              </button>
            </div>
            {cierres.length === 0 ? (
              <p className="py-2 text-center text-xs text-gray-600">No hay cierres programados</p>
            ) : (
              <div className="space-y-2">
                {cierres.map((c) => (
                  <div key={c.id} className="flex items-center justify-between rounded-lg bg-gray-800 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">
                        {c.fecha}{" "}
                        <span className="rounded-full bg-gray-700 px-2 py-0.5 text-xs text-gray-300">
                          {c.servicio === "todo" ? "Todo el día" : c.servicio === "comida" ? "Comida" : "Cena"}
                        </span>
                      </p>
                      {c.motivo && <p className="mt-0.5 text-xs text-gray-500">{c.motivo}</p>}
                    </div>
                    <button onClick={() => eliminarCierre(c.id)} className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-700 hover:text-red-400">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button onClick={guardar} disabled={guardando}
          className="mt-8 w-full rounded-xl bg-karuma-600 py-3 text-base font-bold text-white disabled:opacity-50">
          {guardando ? "Guardando…" : ok ? "✓ Guardado" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:border-karuma-600 focus:outline-none";
const timeCls  = "w-24 rounded-lg border border-gray-700 bg-gray-900 px-2 py-1 text-xs text-gray-200 focus:border-karuma-600 focus:outline-none";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <label className="text-sm text-gray-300">{label}</label>
      <div className="w-36">{children}</div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm text-gray-300">{label}</label>
      <button onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-karuma-600" : "bg-gray-700"}`}>
        <span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${value ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}
