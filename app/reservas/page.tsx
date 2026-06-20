"use client";

import { useState, useEffect, useMemo } from "react";
import { Phone, MessageCircle, MapPin, Instagram, ChevronRight, ChevronLeft, CheckCircle2, Users } from "lucide-react";

type Servicio = "comida" | "cena";
type Step = "personas" | "fecha" | "servicio" | "hora" | "datos" | "confirmado";

const MAPS_URL = "https://maps.google.com/?q=C+de+Roger+de+Ll%C3%B2ria+2+Valencia";
const FALLBACK_TEL = "+34676706776";

interface PublicConfig {
  reservas_online_activas: boolean;
  max_personas_online: number;
  dias_max_antelacion: number;
  telefono: string | null;
  whatsapp: string | null;
  comida_inicio: string;
  comida_fin: string;
  cena_inicio: string;
  cena_fin: string;
}

export default function ReservasPage() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [step, setStep] = useState<Step>("personas");
  const [personas, setPersonas] = useState(0);
  const [fecha, setFecha] = useState("");
  const [servicio, setServicio] = useState<Servicio | null>(null);
  const [hora, setHora] = useState("");
  const [slots, setSlots] = useState<{ hora: string; disponible: boolean }[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [reservaId, setReservaId] = useState("");
  const [mesasAsignadas, setMesasAsignadas] = useState<number[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/reservas/config")
      .then((r) => r.json())
      .then(setConfig)
      .catch(() => null);
  }, []);

  const TELEFONO = config?.telefono?.replace(/\s/g, "") || FALLBACK_TEL;
  const WHATSAPP = config?.whatsapp?.replace(/\s/g, "") || FALLBACK_TEL;
  const MAX_DIAS = 7; // máximo permitido por política del restaurante

  const hoy = new Date().toISOString().split("T")[0];
  const maxFecha = new Date();
  maxFecha.setDate(maxFecha.getDate() + MAX_DIAS);
  const maxFechaStr = maxFecha.toISOString().split("T")[0];

  // Genera los días válidos (hoy + 7) para el selector visual, filtrados por días de apertura
  const diasValidos = useMemo(() => {
    const lista: { valor: string; etiqueta: string }[] = [];
    const MESES_ES = ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"];
    const DIAS_ES = ["domingo","lunes","martes","miércoles","jueves","viernes","sábado"];

    // Lee días de apertura desde localStorage (sin importar el módulo para evitar SSR issues)
    let diasAbiertos: number[] = [0,1,2,3,4,5,6];
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("karuma_horario_v1") : null;
      if (raw) diasAbiertos = (JSON.parse(raw) as { diasAbiertos: number[] }).diasAbiertos;
    } catch { /* usa default */ }

    for (let i = 0; i <= MAX_DIAS; i++) {
      const d = new Date(); d.setDate(d.getDate() + i);
      if (!diasAbiertos.includes(d.getDay())) continue; // día cerrado, omitir
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const valor = `${yyyy}-${mm}-${dd}`;
      const etiqueta = i === 0
        ? `Hoy, ${d.getDate()} de ${MESES_ES[d.getMonth()]}`
        : i === 1
        ? `Mañana, ${d.getDate()} de ${MESES_ES[d.getMonth()]}`
        : `${DIAS_ES[d.getDay()].charAt(0).toUpperCase() + DIAS_ES[d.getDay()].slice(1)}, ${d.getDate()} de ${MESES_ES[d.getMonth()]}`;
      lista.push({ valor, etiqueta });
    }
    return lista;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cargarSlots(f: string, s: Servicio, p: number) {
    setLoadingSlots(true);
    setSlots([]);
    try {
      const res = await fetch(`/api/reservas/disponibilidad?fecha=${f}&servicio=${s}&personas=${p}`);
      const data = await res.json();
      setSlots(data.slots ?? []);
    } catch {
      setSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  }

  async function confirmarReserva() {
    if (!telefono.trim()) {
      setError("El teléfono es obligatorio");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/reservas/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, telefono, personas, fecha, hora, servicio, notas, origen: "online" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al reservar");
      setReservaId(data.reservaId);
      setMesasAsignadas(data.mesaIds ?? []);
      setStep("confirmado");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al reservar");
    } finally {
      setEnviando(false);
    }
  }

  const slotsVisibles = slots.filter((s) => s.disponible);
  const hayAlgunSlot = slotsVisibles.length > 0;

  const formatFecha = (f: string) => {
    if (!f) return "";
    const [y, m, d] = f.split("-");
    return `${d}/${m}/${y}`;
  };

  if (step === "confirmado") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-karuma-600 text-2xl font-black text-white">
              K
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-karuma-600">Karuma</p>
            <p className="text-sm text-gray-500">Sushi & Grill · Valencia</p>
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-lg">
            <div className="mb-4 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-12 w-12 text-emerald-500" />
              <h1 className="text-xl font-bold text-gray-900">Reserva confirmada</h1>
            </div>

            <div className="space-y-3 rounded-xl bg-gray-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Fecha</span>
                <span className="font-semibold text-gray-900">{formatFecha(fecha)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Hora</span>
                <span className="font-semibold text-gray-900">{hora}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Personas</span>
                <span className="font-semibold text-gray-900">{personas}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Servicio</span>
                <span className="font-semibold text-gray-900 capitalize">{servicio}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Nombre</span>
                <span className="font-semibold text-gray-900">{nombre}</span>
              </div>
              {mesasAsignadas.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Mesa</span>
                  <span className="font-semibold text-gray-900">{mesasAsignadas.join(", ")}</span>
                </div>
              )}
            </div>

            <div className="mt-4 rounded-xl bg-karuma-50 p-4 text-center text-sm">
              <p className="font-bold text-gray-900">Karuma Sushi & Grill</p>
              <p className="mt-0.5 text-gray-600">C/ de Roger de Llòria, 2 · Valencia</p>
              <a
                href={MAPS_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1.5 text-karuma-600 hover:underline"
              >
                <MapPin className="h-3.5 w-3.5" /> Ver en Google Maps
              </a>
            </div>

            <button
              onClick={() => {
                setStep("personas");
                setPersonas(0);
                setFecha("");
                setServicio(null);
                setHora("");
                setNombre("");
                setTelefono("");
                setNotas("");
                setReservaId("");
                setMesasAsignadas([]);
              }}
              className="mt-4 w-full rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Hacer otra reserva
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white px-4 py-5 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-karuma-600 text-lg font-black text-white">
          K
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-karuma-600">Karuma</p>
        <h1 className="text-lg font-bold text-gray-900">Sushi & Grill · Valencia</h1>
        <p className="text-sm text-gray-500">Reserva tu mesa online</p>
      </header>

      {/* Progress dots */}
      {step !== "personas" && (
        <div className="flex justify-center gap-2 border-b border-gray-100 py-3">
          {(["fecha", "servicio", "hora", "datos"] as Step[]).map((s, i) => (
            <div
              key={s}
              className={`h-2 w-2 rounded-full transition-colors ${
                ["fecha", "servicio", "hora", "datos"].indexOf(step) >= i
                  ? "bg-karuma-600"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      )}

      <main className="mx-auto max-w-md px-4 py-8">

        {/* PASO 1: nº de personas */}
        {step === "personas" && (
          <section>
            <h2 className="mb-2 text-xl font-bold text-gray-900">¿Para cuántas personas?</h2>
            <p className="mb-6 text-sm text-gray-500">Selecciona el número de comensales</p>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setPersonas(n);
                    setStep("fecha");
                  }}
                  className="group relative flex flex-col items-center rounded-2xl border-2 border-gray-200 py-6 transition-all hover:border-karuma-600"
                >
                  <Users className="mb-1 h-5 w-5 text-gray-400 group-hover:text-karuma-600" />
                  <span className="text-2xl font-bold text-gray-900 group-hover:text-karuma-600">{n}</span>
                  <span className="text-[10px] text-gray-400">{n === 1 ? "persona" : "personas"}</span>
                </button>
              ))}
            </div>

            {/* Más de 4 */}
            <div className="mt-6 rounded-2xl border border-gray-100 bg-gray-50 p-5">
              <p className="text-sm font-semibold text-gray-900">¿Más de 4 personas?</p>
              <p className="mt-1 text-sm text-gray-500">
                Para reservas de más de 4 personas, por favor llámanos o escríbenos por WhatsApp.
              </p>
              <div className="mt-4 flex gap-3">
                <a
                  href={`tel:${TELEFONO}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gray-900 py-3 text-sm font-semibold text-white"
                >
                  <Phone className="h-4 w-4" /> Llamar
                </a>
                <a
                  href={`https://wa.me/${WHATSAPP.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] py-3 text-sm font-semibold text-white"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </div>
            </div>

            {/* Menús */}
            <section className="mt-10 border-t border-gray-100 pt-8">
              <h3 className="mb-4 text-base font-bold text-gray-900">Nuestros menús</h3>
              <p className="mb-3 text-sm text-gray-500">Buffet libre de sushi, grill y platos calientes.</p>
              <div className="space-y-2">
                {[
                  { icon: "🍣", nombre: "Buffet Mediodía", precio: "19,90 €" },
                  { icon: "🌙", nombre: "Buffet Cena y Fin de Semana", precio: "24,90 €" },
                  { icon: "👦", nombre: "Menú Infantil", precio: "12,50 €" },
                ].map((m) => (
                  <div
                    key={m.nombre}
                    className="flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3"
                  >
                    <span className="text-sm text-gray-800">
                      {m.icon} {m.nombre}
                    </span>
                    <span className="text-sm font-bold text-gray-900">{m.precio}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 px-1 text-xs text-gray-400">🥤 Bebidas no incluidas</p>

              <div className="mt-6 flex flex-wrap gap-2">
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <MapPin className="h-4 w-4 text-red-500" /> Google Maps
                </a>
                <a
                  href="https://www.instagram.com/karuma.valencia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <Instagram className="h-4 w-4 text-pink-500" /> Instagram
                </a>
                <a
                  href="https://www.tiktok.com/@karuma.valencia"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.75a8.24 8.24 0 0 0 4.82 1.55V6.86a4.86 4.86 0 0 1-1.05-.17z" />
                  </svg>
                  TikTok
                </a>
              </div>
            </section>
          </section>
        )}

        {/* PASO 2: fecha */}
        {step === "fecha" && (
          <section>
            <button
              onClick={() => setStep("personas")}
              className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="h-4 w-4" /> Volver
            </button>
            <h2 className="mb-2 text-xl font-bold text-gray-900">¿Qué día quieres reservar?</h2>
            <p className="mb-6 text-sm text-gray-500">Puedes reservar hasta 7 días de antelación</p>

            <div className="space-y-3">
              {diasValidos.map(({ valor, etiqueta }) => (
                <button
                  key={valor}
                  onClick={() => { setFecha(valor); setError(""); }}
                  className={`flex w-full items-center justify-between rounded-2xl border-2 px-5 py-4 text-left transition-all ${
                    fecha === valor
                      ? "border-karuma-600 bg-karuma-50 text-karuma-700"
                      : "border-gray-200 text-gray-800 hover:border-karuma-400"
                  }`}
                >
                  <span className="text-base font-semibold">{etiqueta}</span>
                  {fecha === valor && <ChevronRight className="h-5 w-5 text-karuma-600" />}
                </button>
              ))}
            </div>

            {fecha && (
              <button
                onClick={() => setStep("servicio")}
                className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-karuma-600 py-4 text-base font-bold text-white hover:bg-karuma-700"
              >
                Continuar <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </section>
        )}

        {/* PASO 3: servicio */}
        {step === "servicio" && (
          <section>
            <button
              onClick={() => setStep("fecha")}
              className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="h-4 w-4" /> Volver
            </button>
            <h2 className="mb-2 text-xl font-bold text-gray-900">¿Comida o cena?</h2>
            <p className="mb-6 text-sm text-gray-500">{formatFecha(fecha)} · {personas} {personas === 1 ? "persona" : "personas"}</p>
            <div className="grid grid-cols-2 gap-4">
              {(["comida", "cena"] as Servicio[]).map((s) => (
                <button
                  key={s}
                  onClick={async () => {
                    setServicio(s);
                    await cargarSlots(fecha, s, personas);
                    setStep("hora");
                  }}
                  className="rounded-2xl border-2 border-gray-200 py-8 text-center transition-all hover:border-karuma-600 hover:shadow-sm"
                >
                  <span className="text-3xl">{s === "comida" ? "🍱" : "🍣"}</span>
                  <p className="mt-2 text-base font-bold text-gray-900 capitalize">{s}</p>
                  <p className="mt-1 text-xs text-gray-400">
                    {s === "comida"
                      ? `${config?.comida_inicio ?? "13:00"} – ${config?.comida_fin ?? "15:30"}`
                      : `${config?.cena_inicio ?? "20:00"} – ${config?.cena_fin ?? "23:00"}`}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* PASO 4: hora */}
        {step === "hora" && (
          <section>
            <button
              onClick={() => setStep("servicio")}
              className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="h-4 w-4" /> Volver
            </button>
            <h2 className="mb-2 text-xl font-bold text-gray-900">¿A qué hora?</h2>
            <p className="mb-6 text-sm text-gray-500">
              {formatFecha(fecha)} · {servicio === "comida" ? "Comida" : "Cena"} · {personas} {personas === 1 ? "persona" : "personas"}
            </p>
            {loadingSlots ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-karuma-600" />
                <p className="mt-3 text-sm text-gray-500">Comprobando disponibilidad…</p>
              </div>
            ) : !hayAlgunSlot ? (
              <div className="rounded-2xl bg-gray-50 p-6 text-center">
                <p className="text-base font-semibold text-gray-700">No hay disponibilidad</p>
                <p className="mt-1 text-sm text-gray-500">Elige otro día o contáctanos.</p>
                <div className="mt-4 flex justify-center gap-3">
                  <a
                    href={`tel:${TELEFONO}`}
                    className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <Phone className="h-4 w-4" /> Llamar
                  </a>
                  <a
                    href={`https://wa.me/${WHATSAPP.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-semibold text-white"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {slots.map((s) =>
                  s.disponible ? (
                    <button
                      key={s.hora}
                      onClick={() => {
                        setHora(s.hora);
                        setStep("datos");
                      }}
                      className={`rounded-2xl border-2 py-4 text-base font-bold transition-all ${
                        hora === s.hora
                          ? "border-karuma-600 bg-karuma-600 text-white shadow-md"
                          : "border-gray-200 text-gray-900 hover:border-karuma-600 hover:text-karuma-600"
                      }`}
                    >
                      {s.hora}
                    </button>
                  ) : null,
                )}
              </div>
            )}
          </section>
        )}

        {/* PASO 5: datos personales */}
        {step === "datos" && (
          <section>
            <button
              onClick={() => setStep("hora")}
              className="mb-6 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700"
            >
              <ChevronLeft className="h-4 w-4" /> Volver
            </button>
            <h2 className="mb-2 text-xl font-bold text-gray-900">Tus datos</h2>
            <p className="mb-6 text-sm text-gray-500">Necesitamos tus datos para confirmar la reserva</p>

            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nombre completo *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3.5 text-base focus:border-karuma-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                  Teléfono / WhatsApp *
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3.5 text-base focus:border-karuma-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-600">
                  Notas <span className="text-gray-400">(opcional)</span>
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Alergias, celebración, silla de bebé…"
                  rows={3}
                  className="w-full rounded-2xl border-2 border-gray-200 px-4 py-3 text-base focus:border-karuma-600 focus:outline-none"
                />
              </div>
            </div>

            {/* Resumen */}
            <div className="mt-5 rounded-2xl bg-gray-50 p-4 text-sm">
              <p className="mb-2 font-bold text-gray-900">Resumen de tu reserva</p>
              <div className="space-y-1 text-gray-600">
                <p>📅 {formatFecha(fecha)} · {hora}</p>
                <p>👥 {personas} {personas === 1 ? "persona" : "personas"}</p>
                <p>🍽️ {servicio === "comida" ? "Comida" : "Cena"}</p>
              </div>
            </div>

            {error && (
              <p className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600">
                {error}
              </p>
            )}

            <button
              onClick={confirmarReserva}
              disabled={!nombre.trim() || !telefono.trim() || enviando}
              className="mt-5 w-full rounded-2xl bg-karuma-600 py-4 text-base font-bold text-white disabled:opacity-40 hover:bg-karuma-700"
            >
              {enviando ? "Confirmando reserva…" : "Confirmar reserva"}
            </button>

            <p className="mt-3 text-center text-xs text-gray-400">
              Al confirmar aceptas que usaremos tu teléfono para gestionar tu reserva.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}
