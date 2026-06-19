"use client";

import { useState, useEffect } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { ReservasConfig } from "@/lib/reservas/types";
import { ReservasNav } from "@/components/reservas/ReservasNav";

const DEFAULT_CONFIG: ReservasConfig = {
  reservas_online_activas: true,
  max_personas_online: 4,
  intervalo_min: 15,
  duracion_1_2_min: 90,
  duracion_3_4_min: 120,
  dias_max_antelacion: 30,
  capacidad_online_pct: 70,
  comida_inicio: "13:00",
  comida_fin: "15:00",
  cena_inicio: "20:00",
  cena_fin: "22:00",
  telefono: "",
  whatsapp: "",
  google_review_link: null,
};

export default function ConfigReservasPage() {
  const [config, setConfig] = useState<ReservasConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    (async () => {
      const sb = getSupabaseClient();
      if (!sb) { setLoading(false); return; }
      const { data } = await sb.from("reservas_config").select("*").eq("id", 1).single();
      if (data) setConfig(data as ReservasConfig);
      setLoading(false);
    })();
  }, []);

  async function guardar() {
    setGuardando(true);
    const sb = getSupabaseClient();
    if (!sb) { setGuardando(false); return; }
    await sb.from("reservas_config").update(config).eq("id", 1);
    setGuardando(false);
    setOk(true);
    setTimeout(() => setOk(false), 2000);
  }

  function set<K extends keyof ReservasConfig>(k: K, v: ReservasConfig[K]) {
    setConfig((prev) => ({ ...prev, [k]: v }));
  }

  if (loading) return <div className="p-8 text-gray-400">Cargando…</div>;

  return (
    <div className="-m-3 min-h-[calc(100dvh)] bg-gray-950 p-4 text-gray-100 sm:-m-4 md:-m-6 md:p-6">
      <div className="mx-auto max-w-lg">
        <ReservasNav />
        <h1 className="mb-6 text-xl font-bold">Configuración de Reservas</h1>

        <div className="space-y-5">
          <Section title="General">
            <Toggle
              label="Reservas online activas"
              value={config.reservas_online_activas}
              onChange={(v) => set("reservas_online_activas", v)}
            />
            <Field label="Máx. personas online" type="number">
              <input
                type="number" min={1} max={20}
                value={config.max_personas_online}
                onChange={(e) => set("max_personas_online", Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Intervalo (min)" type="number">
              <input
                type="number" min={5} max={60} step={5}
                value={config.intervalo_min}
                onChange={(e) => set("intervalo_min", Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Duración 1–2 personas (min)">
              <input
                type="number" min={30} max={240} step={15}
                value={config.duracion_1_2_min}
                onChange={(e) => set("duracion_1_2_min", Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Duración 3–4 personas (min)">
              <input
                type="number" min={30} max={240} step={15}
                value={config.duracion_3_4_min}
                onChange={(e) => set("duracion_3_4_min", Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="Días máx. de antelación">
              <input
                type="number" min={1} max={90}
                value={config.dias_max_antelacion}
                onChange={(e) => set("dias_max_antelacion", Number(e.target.value))}
                className={inputCls}
              />
            </Field>
            <Field label="% aforo para online">
              <input
                type="number" min={10} max={100} step={5}
                value={config.capacidad_online_pct}
                onChange={(e) => set("capacidad_online_pct", Number(e.target.value))}
                className={inputCls}
              />
            </Field>
          </Section>

          <Section title="Horarios">
            <Field label="Comida — inicio">
              <input type="time" value={config.comida_inicio} onChange={(e) => set("comida_inicio", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Comida — último pase">
              <input type="time" value={config.comida_fin} onChange={(e) => set("comida_fin", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Cena — inicio">
              <input type="time" value={config.cena_inicio} onChange={(e) => set("cena_inicio", e.target.value)} className={inputCls} />
            </Field>
            <Field label="Cena — último pase">
              <input type="time" value={config.cena_fin} onChange={(e) => set("cena_fin", e.target.value)} className={inputCls} />
            </Field>
          </Section>

          <Section title="Contacto">
            <Field label="Teléfono">
              <input type="tel" value={config.telefono ?? ""} onChange={(e) => set("telefono", e.target.value)} className={inputCls} placeholder="+34 963 000 000" />
            </Field>
            <Field label="WhatsApp">
              <input type="tel" value={config.whatsapp ?? ""} onChange={(e) => set("whatsapp", e.target.value)} className={inputCls} placeholder="+34 600 000 000" />
            </Field>
            <Field label="Link Google Review">
              <input type="url" value={config.google_review_link ?? ""} onChange={(e) => set("google_review_link", e.target.value || null)} className={inputCls} placeholder="https://g.page/r/…" />
            </Field>
          </Section>
        </div>

        <button
          onClick={guardar}
          disabled={guardando}
          className="mt-8 w-full rounded-xl bg-karuma-600 py-3 text-base font-bold text-white disabled:opacity-50"
        >
          {guardando ? "Guardando…" : ok ? "✓ Guardado" : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm focus:border-karuma-600 focus:outline-none";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900 p-4">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</h2>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; type?: string; children: React.ReactNode }) {
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
      <button
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition-colors ${value ? "bg-karuma-600" : "bg-gray-700"}`}
      >
        <span
          className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${value ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}
