"use client";

// Página pública del enlace del correo: el cliente ve su reserva y puede cambiarla o cancelarla.
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type Info = {
  reserva: { fecha: string; hora: string; personas: number; servicio: "comida" | "cena"; estado: string; nombre: string };
  puedeGestionar: boolean; motivo: string; limiteMin: number; maxPersonas: number; maxDias: number; telefono?: string | null;
};
type Slot = { hora: string; disponible: boolean };


function madridHoy() { return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Madrid" }).format(new Date()); }
function addDays(d: string, n: number) { const x = new Date(d + "T12:00:00Z"); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); }
function fechaLarga(d: string) {
  const s = new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function fechaCorta(d: string) {
  const s = new Intl.DateTimeFormat("es-ES", { weekday: "short", day: "numeric", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function Gestionar() {
  const q = useSearchParams();
  const id = q.get("id") ?? "";
  const t = q.get("t") ?? "";
  const [info, setInfo] = useState<Info | null>(null);
  const [error, setError] = useState("");
  const [modo, setModo] = useState<"ver" | "cambiar" | "cancelar" | "hecho">("ver");
  const [hecho, setHecho] = useState("");
  const [fecha, setFecha] = useState("");
  const [servicio, setServicio] = useState<"comida" | "cena">("cena");
  const [personas, setPersonas] = useState(2);
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [cerrado, setCerrado] = useState(false);
  const [hora, setHora] = useState("");
  const [enviando, setEnviando] = useState(false);

  const cargar = useCallback(async () => {
    const r = await fetch(`/api/reservas/cliente?id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) { setError(j.error ?? "Enlace no válido"); return; }
    setInfo(j as Info);
    setFecha(j.reserva.fecha); setServicio(j.reserva.servicio); setPersonas(j.reserva.personas);
  }, [id, t]);
  useEffect(() => { void cargar(); }, [cargar]);

  useEffect(() => {
    if (modo !== "cambiar" || !fecha) return;
    setSlots(null); setHora(""); setCerrado(false);
    fetch(`/api/reservas/cliente?id=${encodeURIComponent(id)}&t=${encodeURIComponent(t)}&fecha=${fecha}&servicio=${servicio}&personas=${personas}`, { cache: "no-store" })
      .then((r) => r.json()).then((j) => { setSlots(j.slots ?? []); setCerrado(!!j.cerrado); }).catch(() => setSlots([]));
  }, [modo, fecha, servicio, personas, id, t]);

  async function enviar(body: Record<string, unknown>, ok: string) {
    setEnviando(true); setError("");
    try {
      const r = await fetch("/api/reservas/cliente", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, t, ...body }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) { setError(j.error ?? "No se pudo completar."); return; }
      setHecho(ok); setModo("hecho"); await cargar();
    } finally { setEnviando(false); }
  }

  if (error && !info) return <Caja><h1 className="text-xl font-bold">Enlace no válido</h1><p className="mt-2 text-stone-600">No encontramos esta reserva. Si necesitas ayuda, llama al restaurante.</p></Caja>;
  if (!info) return <Caja><p className="text-stone-500">Cargando…</p></Caja>;

  const r = info.reserva;
  const hoy = madridHoy();
  const dias = Array.from({ length: info.maxDias + 1 }, (_, i) => addDays(hoy, i));

  return (
    <Caja>
      <p className="text-sm uppercase tracking-wide text-stone-500">Karuma Sushi &amp; Grill</p>
      <h1 className="mt-1 text-2xl font-bold">{r.nombre ? `Hola ${r.nombre}` : "Tu reserva"}</h1>

      <div className={`mt-5 rounded-2xl p-4 ${r.estado === "Cancelada" ? "bg-stone-200 text-stone-500 line-through" : "bg-white"}`}>
        <div className="text-lg font-semibold">{fechaLarga(r.fecha)}</div>
        <div className="mt-1 text-3xl font-bold">{r.hora}</div>
        <div className="mt-1 text-stone-600">{r.personas} {r.personas === 1 ? "persona" : "personas"} · {r.servicio === "cena" ? "Cena" : "Comida"}</div>
      </div>
      {r.estado === "Cancelada" && <p className="mt-3 font-semibold text-red-700">Reserva cancelada</p>}

      {modo === "hecho" && <p className="mt-4 rounded-xl bg-emerald-50 p-3 font-semibold text-emerald-800">{hecho}</p>}
      {error && <p className="mt-4 rounded-xl bg-red-50 p-3 text-red-700">{error}</p>}

      {info.puedeGestionar && modo === "ver" && (
        <div className="mt-6 grid gap-3">
          <button onClick={() => setModo("cambiar")} className="rounded-xl bg-stone-900 py-3 font-semibold text-white">Cambiar fecha, hora o personas</button>
          <button onClick={() => setModo("cancelar")} className="rounded-xl border border-stone-300 py-3 font-semibold text-red-700">Cancelar reserva</button>
        </div>
      )}

      {info.puedeGestionar && modo === "cancelar" && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="font-semibold">¿Seguro que quieres cancelar la reserva?</p>
          <div className="mt-3 flex gap-2">
            <button disabled={enviando} onClick={() => enviar({ action: "cancelar" }, "Tu reserva se ha cancelado. ¡Esperamos verte pronto!")} className="flex-1 rounded-xl bg-red-700 py-3 font-semibold text-white disabled:opacity-60">Sí, cancelar</button>
            <button onClick={() => setModo("ver")} className="flex-1 rounded-xl border border-stone-300 bg-white py-3 font-semibold">Volver</button>
          </div>
        </div>
      )}

      {info.puedeGestionar && modo === "cambiar" && (
        <div className="mt-6 space-y-5">
          <div>
            <p className="mb-2 font-semibold">Personas</p>
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: info.maxPersonas }, (_, i) => i + 1).map((n) => (
                <button key={n} onClick={() => setPersonas(n)} className={`h-11 w-11 rounded-full border font-semibold ${personas === n ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white"}`}>{n}</button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 font-semibold">Día</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {dias.map((d) => (
                <button key={d} onClick={() => setFecha(d)} className={`shrink-0 rounded-xl border px-3 py-2 text-sm font-semibold ${fecha === d ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white"}`}>{d === hoy ? "Hoy" : fechaCorta(d)}</button>
              ))}
            </div>
          </div>
          <div>
            <div className="mb-2 flex gap-2">
              {(["comida", "cena"] as const).map((s) => (
                <button key={s} onClick={() => setServicio(s)} className={`flex-1 rounded-xl border py-2 font-semibold ${servicio === s ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white"}`}>{s === "comida" ? "Comida" : "Cena"}</button>
              ))}
            </div>
            {slots === null ? <p className="text-sm text-stone-500">Comprobando disponibilidad…</p>
              : cerrado ? <p className="text-sm text-stone-600">Ese servicio está cerrado.</p>
              : !slots.some((s) => s.disponible) ? <p className="text-sm text-stone-600">No quedan horas libres. Prueba otro día o servicio.</p>
              : (
                <div className="grid grid-cols-4 gap-2">
                  {slots.map((s) => (
                    <button key={s.hora} disabled={!s.disponible} onClick={() => setHora(s.hora)}
                      className={`rounded-xl border py-2 text-sm font-semibold ${hora === s.hora ? "border-stone-900 bg-stone-900 text-white" : s.disponible ? "border-stone-300 bg-white" : "border-transparent bg-stone-100 text-stone-300 line-through"}`}>{s.hora}</button>
                  ))}
                </div>
              )}
          </div>
          <div className="flex gap-2">
            <button disabled={!hora || enviando} onClick={() => enviar({ action: "cambiar", fecha, hora, personas }, "¡Listo! Tu reserva se ha cambiado.")} className="flex-1 rounded-xl bg-stone-900 py-3 font-semibold text-white disabled:opacity-40">Confirmar cambio</button>
            <button onClick={() => { setModo("ver"); setError(""); }} className="rounded-xl border border-stone-300 bg-white px-4 py-3 font-semibold">Volver</button>
          </div>
        </div>
      )}

      {!info.puedeGestionar && r.estado !== "Cancelada" && (
        <p className="mt-6 text-stone-600">
          {info.motivo === "tarde"
            ? <>Faltan menos de {info.limiteMin / 60} horas para tu reserva. Para cambiarla o cancelarla, {info.telefono ? <>llámanos al <a className="font-semibold underline" href={`tel:${info.telefono.replace(/\s/g, "")}`}>{info.telefono}</a>.</> : "llama al restaurante."}</>
            : "Esta reserva ya no se puede modificar."}
        </p>
      )}
      {info.puedeGestionar && modo === "ver" && <p className="mt-4 text-sm text-stone-500">Puedes cambiarla o cancelarla hasta {info.limiteMin / 60} horas antes.</p>}
    </Caja>
  );
}

function Caja({ children }: { children: React.ReactNode }) {
  return <main className="mx-auto max-w-md px-5 py-10">{children}</main>;
}

export default function Page() {
  return <Suspense fallback={<Caja><p className="text-stone-500">Cargando…</p></Caja>}><Gestionar /></Suspense>;
}
