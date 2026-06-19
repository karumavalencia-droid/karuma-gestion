"use client";

import { useState } from "react";
import { Phone, MessageCircle, MapPin, Instagram, CheckCircle2, ChevronRight, ChevronLeft } from "lucide-react";

type Servicio = "comida" | "cena";
type Step = "personas" | "fecha" | "servicio" | "hora" | "datos" | "confirmado";

const WHATSAPP = "+34600000000";
const TELEFONO = "+34963000000";

export default function ReservasPage() {
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
  const [error, setError] = useState("");

  const hoy = new Date().toISOString().split("T")[0];
  const maxFecha = new Date();
  maxFecha.setDate(maxFecha.getDate() + 30);
  const maxFechaStr = maxFecha.toISOString().split("T")[0];

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
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/reservas/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, telefono, personas, fecha, hora, servicio, notas }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al reservar");
      setReservaId(data.reservaId);
      setStep("confirmado");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al reservar");
    } finally {
      setEnviando(false);
    }
  }

  if (step === "confirmado") {
    const msg = encodeURIComponent(
      `Hola, acabo de hacer una reserva en Karuma Sushi & Grill.\nNombre: ${nombre}\nFecha: ${fecha} ${hora}\nPersonas: ${personas} (${servicio})\nID: ${reservaId}`,
    );
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12">
        <div className="w-full max-w-md text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-emerald-500" />
          <h1 className="text-2xl font-bold text-gray-900">¡Reserva confirmada!</h1>
          <p className="mt-2 text-gray-600">
            {fecha} · {hora} · {personas} personas · {servicio}
          </p>
          <p className="mt-1 text-sm text-gray-500">A nombre de {nombre}</p>
          <a
            href={`https://wa.me/${WHATSAPP.replace(/\D/g, "")}?text=${msg}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-white font-semibold hover:bg-emerald-600"
          >
            <MessageCircle className="h-5 w-5" />
            Enviar confirmación por WhatsApp
          </a>
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
            }}
            className="mt-4 text-sm text-gray-500 underline"
          >
            Hacer otra reserva
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 bg-white px-4 py-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-karuma-600">Karuma</p>
        <h1 className="mt-0.5 text-xl font-bold text-gray-900">Sushi & Grill · Valencia</h1>
        <p className="text-sm text-gray-500">Reservas online</p>
      </header>

      <main className="mx-auto max-w-lg px-4 py-8">
        {/* PASO: nº de personas */}
        {step === "personas" && (
          <section>
            <h2 className="mb-6 text-lg font-bold text-gray-900">¿Para cuántas personas?</h2>
            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setPersonas(n);
                    setStep("fecha");
                  }}
                  className="rounded-xl border-2 border-gray-200 py-5 text-xl font-bold text-gray-900 hover:border-karuma-600 hover:text-karuma-600"
                >
                  {n}
                </button>
              ))}
            </div>
            <div className="mt-6 rounded-xl border border-gray-100 bg-gray-50 p-4">
              <p className="text-sm font-medium text-gray-700">¿Más de 4 personas?</p>
              <p className="mt-1 text-sm text-gray-500">
                Para grupos grandes contáctanos directamente:
              </p>
              <div className="mt-3 flex gap-3">
                <a
                  href={`tel:${TELEFONO}`}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-gray-800 py-2.5 text-sm font-medium text-white"
                >
                  <Phone className="h-4 w-4" /> Llamar
                </a>
                <a
                  href={`https://wa.me/${WHATSAPP.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2.5 text-sm font-medium text-white"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </div>
            </div>
          </section>
        )}

        {/* PASO: fecha */}
        {step === "fecha" && (
          <section>
            <button onClick={() => setStep("personas")} className="mb-4 flex items-center gap-1 text-sm text-gray-500">
              <ChevronLeft className="h-4 w-4" /> Volver
            </button>
            <h2 className="mb-6 text-lg font-bold text-gray-900">¿Qué día?</h2>
            <input
              type="date"
              min={hoy}
              max={maxFechaStr}
              value={fecha}
              onChange={(e) => setFecha(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 text-lg focus:border-karuma-600 focus:outline-none"
            />
            {fecha && (
              <button
                onClick={() => setStep("servicio")}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-karuma-600 py-3 text-white font-semibold"
              >
                Continuar <ChevronRight className="h-4 w-4" />
              </button>
            )}
          </section>
        )}

        {/* PASO: servicio */}
        {step === "servicio" && (
          <section>
            <button onClick={() => setStep("fecha")} className="mb-4 flex items-center gap-1 text-sm text-gray-500">
              <ChevronLeft className="h-4 w-4" /> Volver
            </button>
            <h2 className="mb-6 text-lg font-bold text-gray-900">¿Comida o cena?</h2>
            <div className="grid grid-cols-2 gap-4">
              {(["comida", "cena"] as Servicio[]).map((s) => (
                <button
                  key={s}
                  onClick={async () => {
                    setServicio(s);
                    await cargarSlots(fecha, s, personas);
                    setStep("hora");
                  }}
                  className="rounded-xl border-2 border-gray-200 py-6 text-lg font-semibold capitalize text-gray-900 hover:border-karuma-600 hover:text-karuma-600"
                >
                  {s === "comida" ? "🍱 Comida" : "🍣 Cena"}
                  <p className="mt-1 text-xs font-normal text-gray-500">
                    {s === "comida" ? "13:00 – 15:00" : "20:00 – 22:00"}
                  </p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* PASO: hora */}
        {step === "hora" && (
          <section>
            <button onClick={() => setStep("servicio")} className="mb-4 flex items-center gap-1 text-sm text-gray-500">
              <ChevronLeft className="h-4 w-4" /> Volver
            </button>
            <h2 className="mb-6 text-lg font-bold text-gray-900">¿A qué hora?</h2>
            {loadingSlots ? (
              <p className="text-center text-gray-500">Comprobando disponibilidad…</p>
            ) : slots.filter((s) => s.disponible).length === 0 ? (
              <p className="rounded-xl bg-gray-50 p-4 text-center text-gray-600">
                No hay disponibilidad para esta fecha. Elige otro día o contáctanos.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {slots
                  .filter((s) => s.disponible)
                  .map((s) => (
                    <button
                      key={s.hora}
                      onClick={() => {
                        setHora(s.hora);
                        setStep("datos");
                      }}
                      className="rounded-xl border-2 border-gray-200 py-3 text-base font-semibold text-gray-900 hover:border-karuma-600 hover:text-karuma-600"
                    >
                      {s.hora}
                    </button>
                  ))}
              </div>
            )}
          </section>
        )}

        {/* PASO: datos personales */}
        {step === "datos" && (
          <section>
            <button onClick={() => setStep("hora")} className="mb-4 flex items-center gap-1 text-sm text-gray-500">
              <ChevronLeft className="h-4 w-4" /> Volver
            </button>
            <h2 className="mb-6 text-lg font-bold text-gray-900">Tus datos</h2>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Nombre *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-karuma-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  WhatsApp / Teléfono *
                </label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-karuma-600 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Notas (opcional)
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Alergias, celebración, silla de bebé…"
                  rows={3}
                  className="w-full rounded-xl border-2 border-gray-200 px-4 py-3 focus:border-karuma-600 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-800">Resumen</p>
              <p className="mt-1">📅 {fecha} · {hora} · {personas} personas</p>
              <p>🍽️ {servicio === "comida" ? "Comida" : "Cena"}</p>
            </div>

            {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

            <button
              onClick={confirmarReserva}
              disabled={!nombre || !telefono || enviando}
              className="mt-6 w-full rounded-xl bg-karuma-600 py-4 text-lg font-bold text-white disabled:opacity-50"
            >
              {enviando ? "Confirmando…" : "Confirmar reserva"}
            </button>
          </section>
        )}

        {/* Info del restaurante */}
        {step === "personas" && (
          <section className="mt-12 space-y-4 border-t border-gray-100 pt-8">
            <h3 className="text-base font-bold text-gray-900">Nuestros menús</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <div className="flex justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span>Buffet libre comida</span>
                <span className="font-semibold">19,90 €</span>
              </div>
              <div className="flex justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span>Buffet libre cena y fines de semana</span>
                <span className="font-semibold">24,50 €</span>
              </div>
              <div className="flex justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span>Sushi Burger (16:00–19:00)</span>
                <span className="font-semibold">4,90 €</span>
              </div>
              <p className="px-1 text-xs text-gray-500">* Bebidas no incluidas</p>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="https://maps.google.com/?q=Karuma+Sushi+Grill+Valencia"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <MapPin className="h-4 w-4" /> Google Maps
              </a>
              <a
                href="https://www.instagram.com/karuma.valencia"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <Instagram className="h-4 w-4" /> Instagram
              </a>
              <a
                href="https://www.tiktok.com/@karuma.valencia"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.75a8.24 8.24 0 0 0 4.82 1.55V6.86a4.86 4.86 0 0 1-1.05-.17z"/>
                </svg>
                TikTok
              </a>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
