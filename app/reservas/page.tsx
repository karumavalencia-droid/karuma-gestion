"use client";

import { useState, useEffect, useMemo } from "react";
import { Phone, MessageCircle, MapPin, Navigation, ChevronLeft, ChevronRight } from "lucide-react";

type Servicio = "comida" | "cena";
type Step = "personas" | "fecha" | "servicio" | "hora" | "datos" | "confirmado";

const DIRECCION = "C/ de Roger de Llòria, 2 · Valencia";
const MAPS_QUERY = "Karuma Sushi & Grill, Carrer de Roger de Llòria, 2, Valencia";
// Abre la ficha del local en Google Maps
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAPS_QUERY)}`;
// Abre la navegación paso a paso hasta el restaurante
const DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(MAPS_QUERY)}`;
const FALLBACK_TEL = "+34676706776";

// Tipografías: serif elegante para titulares · mincho para los acentos en kanji
const WORDMARK = '"Optima","Optima Nova LT Pro","Gill Sans","Gill Sans MT","Trebuchet MS",sans-serif';
const SERIF = 'Georgia,"Times New Roman","Songti SC",serif';
const KANJI = '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP","Songti SC",serif';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "13:00:00" → "13:00" (quita los segundos para mostrar la hora limpia)
const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : "");

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
  const [email, setEmail] = useState("");
  const [notas, setNotas] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [reservaId, setReservaId] = useState("");
  const [mesasAsignadas, setMesasAsignadas] = useState<number[]>([]);
  const [emailSent, setEmailSent] = useState(false);
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

  const comidaInicio = hhmm(config?.comida_inicio) || "13:00";
  const comidaFin = hhmm(config?.comida_fin) || "15:00";
  const cenaInicio = hhmm(config?.cena_inicio) || "19:30";
  const cenaFin = hhmm(config?.cena_fin) || "22:00";
  const horarioComida = `${comidaInicio} – ${comidaFin}`;
  const horarioCena = `${cenaInicio} – ${cenaFin}`;

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
    if (!email.trim()) {
      setError("El email es obligatorio para enviar la confirmación");
      return;
    }
    if (!EMAIL_RE.test(email.trim())) {
      setError("Introduce un email válido");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const res = await fetch("/api/reservas/crear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre, telefono, email: email.trim(), personas, fecha, hora, servicio, notas, origen: "online" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al reservar");
      setReservaId(data.reservaId);
      setMesasAsignadas(data.mesaIds ?? []);
      setEmailSent(Boolean(data.emailSent));
      setStep("confirmado");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al reservar");
    } finally {
      setEnviando(false);
    }
  }

  function reiniciar() {
    setStep("personas");
    setPersonas(0);
    setFecha("");
    setServicio(null);
    setHora("");
    setNombre("");
    setTelefono("");
    setEmail("");
    setNotas("");
    setReservaId("");
    setMesasAsignadas([]);
    setEmailSent(false);
    setError("");
  }

  const slotsVisibles = slots.filter((s) => s.disponible);
  const hayAlgunSlot = slotsVisibles.length > 0;

  const formatFecha = (f: string) => {
    if (!f) return "";
    const [y, m, d] = f.split("-");
    return `${d}/${m}/${y}`;
  };

  // ───────────────────────── PANTALLA DE CONFIRMACIÓN ─────────────────────────
  if (step === "confirmado") {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#f6f3ec] px-6 py-12">
        <div className="w-full max-w-sm text-center">
          <Sello char="済" className="mx-auto" big />
          <p className="mt-5 text-sm tracking-[0.3em] text-stone-400" style={{ fontFamily: KANJI }}>
            ご予約ありがとうございます
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-stone-900" style={{ fontFamily: SERIF }}>
            Reserva confirmada
          </h1>
          <p className="mx-auto mt-1.5 max-w-xs text-sm text-stone-500">
            {emailSent
              ? `Hemos enviado la confirmación a ${email}`
              : "Guarda esta pantalla como confirmación de tu reserva."}
          </p>

          <div className="mt-7 border-y border-[#e2dac9] py-2 text-left text-sm">
            <Fila etiqueta="Fecha" valor={formatFecha(fecha)} />
            <Fila etiqueta="Hora" valor={hora} />
            <Fila etiqueta="Personas" valor={String(personas)} />
            <Fila etiqueta="Servicio" valor={servicio === "comida" ? "Comida" : "Cena"} />
            <Fila etiqueta="Nombre" valor={nombre} />
            <Fila etiqueta="Email" valor={email} />
            {mesasAsignadas.length > 0 && <Fila etiqueta="Mesa" valor={mesasAsignadas.join(", ")} />}
            {reservaId && <Fila etiqueta="Nº reserva" valor={reservaId.slice(0, 8).toUpperCase()} />}
          </div>

          <p className="mt-6 font-semibold text-stone-900">Karuma Sushi &amp; Grill</p>
          <p className="mt-0.5 text-sm text-stone-500">{DIRECCION}</p>
          <div className="mt-4 flex justify-center gap-2">
            <a
              href={MAPS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-stone-900 px-4 py-2 text-xs font-medium text-[#f6f3ec] hover:bg-stone-800"
            >
              <MapPin className="h-3.5 w-3.5" /> Google Maps
            </a>
            <a
              href={DIRECTIONS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-4 py-2 text-xs font-medium text-stone-700 hover:border-stone-900"
            >
              <Navigation className="h-3.5 w-3.5" /> Cómo llegar
            </a>
          </div>

          <button
            onClick={reiniciar}
            className="mt-8 text-sm text-stone-400 underline-offset-4 hover:text-stone-700 hover:underline"
          >
            Hacer otra reserva
          </button>
        </div>
      </div>
    );
  }

  // ───────────────────────────── LANDING / PORTADA ─────────────────────────────
  if (step === "personas") {
    return (
      <div className="min-h-[100dvh] bg-[#f6f3ec] text-stone-900">
        {/* HERO */}
        <header className="relative overflow-hidden">
          {/* Kanji marca de agua */}
          <span
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-10 select-none text-[14rem] leading-none text-stone-900/[0.035]"
            style={{ fontFamily: KANJI }}
          >
            鮨
          </span>

          <div className="relative mx-auto max-w-md px-6 pb-12 pt-16 text-center">
            <Sello char="旬" className="mx-auto" />
            <h1
              className="mt-6 text-[2.4rem] font-medium leading-none tracking-[0.22em] text-stone-900"
              style={{ fontFamily: WORDMARK }}
            >
              KARUMA
            </h1>
            <div className="mx-auto mt-4 h-px w-10 bg-karuma-700" />
            <p className="mt-4 text-[0.7rem] font-semibold uppercase tracking-[0.42em] text-stone-500">
              Sushi · Grill
            </p>
            <p className="mx-auto mt-4 max-w-xs text-[0.95rem] leading-relaxed text-stone-600">
              Cocina japonesa, brasa y buffet libre en el corazón de Valencia.
            </p>
            <p className="mt-5 inline-flex items-center gap-1.5 text-xs text-stone-500">
              <MapPin className="h-3.5 w-3.5 text-karuma-700" /> {DIRECCION}
            </p>
          </div>
        </header>

        <main className="mx-auto max-w-md px-6">
          {/* RESERVA */}
          <section className="border-t border-[#e2dac9] pt-10">
            <Kicker jp="ご予約" es="Reserva" />
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900" style={{ fontFamily: SERIF }}>
              Reserva tu mesa
            </h2>
            <p className="mb-6 mt-1 text-sm text-stone-500">En menos de un minuto · hasta 4 personas online</p>

            <div className="grid grid-cols-4 gap-3">
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setPersonas(n);
                    setStep("fecha");
                  }}
                  className="group flex flex-col items-center justify-center rounded-xl border border-[#ddd4c1] bg-white/60 py-5 transition-colors hover:border-karuma-700 hover:bg-white"
                >
                  <span
                    className="text-3xl text-stone-900 transition-colors group-hover:text-karuma-700"
                    style={{ fontFamily: SERIF }}
                  >
                    {n}
                  </span>
                  <span className="mt-1 text-[10px] uppercase tracking-wider text-stone-400">
                    {n === 1 ? "persona" : "personas"}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-[#e2dac9] bg-white/40 p-4">
              <p className="text-sm text-stone-600">
                ¿Sois más de 4? Para grupos grandes, llámanos o escríbenos por WhatsApp.
              </p>
              <div className="mt-3 flex gap-2">
                <a
                  href={`tel:${TELEFONO}`}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-stone-900 px-3 py-2.5 text-sm font-medium text-[#f6f3ec] hover:bg-stone-800"
                >
                  <Phone className="h-4 w-4" /> Llamar
                </a>
                <a
                  href={`https://wa.me/${WHATSAPP.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2.5 text-sm font-medium text-stone-700 hover:border-stone-900"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </a>
              </div>
            </div>
          </section>

          {/* SOBRE NOSOTROS */}
          <section className="mt-14 border-t border-[#e2dac9] pt-10">
            <Kicker jp="こだわり" es="Sobre Karuma" />
            <h2 className="mt-3 text-2xl font-semibold leading-snug tracking-tight text-stone-900" style={{ fontFamily: SERIF }}>
              El sabor de Japón, hecho al momento
            </h2>
            <p className="mt-4 text-[0.95rem] leading-relaxed text-stone-600">
              En Karuma reunimos lo mejor de la cocina japonesa: sushi fresco preparado al momento, carnes y
              pescados a la brasa y un buffet libre para disfrutar sin límites. Un espacio sereno en el centro de
              Valencia donde cada plato se cuida al detalle.
            </p>

            <div className="mt-7">
              {[
                { jp: "鮨", t: "Sushi fresco", d: "Elaborado al momento" },
                { jp: "炭火", t: "A la brasa", d: "Carnes y pescados" },
                { jp: "食べ放題", t: "Buffet libre", d: "Sin límites" },
              ].map((f) => (
                <div key={f.t} className="flex items-center gap-4 border-t border-[#e8e1d2] py-4 first:border-t-0">
                  <span
                    className="w-9 shrink-0 text-center text-lg text-karuma-700/80"
                    style={{ fontFamily: KANJI }}
                    aria-hidden
                  >
                    {f.jp}
                  </span>
                  <div>
                    <p className="text-base font-semibold text-stone-900">{f.t}</p>
                    <p className="text-sm text-stone-500">{f.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* MENÚS */}
          <section className="mt-14 border-t border-[#e2dac9] pt-10">
            <Kicker jp="お品書き" es="Menús" />
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900" style={{ fontFamily: SERIF }}>
              Nuestra carta
            </h2>
            <div className="mt-6">
              {[
                { nombre: "Buffet Mediodía", sub: "Entre semana", precio: "19,90 €" },
                { nombre: "Buffet Cena / Fines de semana y festivos", sub: "", precio: "24,90 €" },
                { nombre: "Menú Infantil", sub: "Hasta 8 años", precio: "12,50 €" },
              ].map((m) => (
                <div key={m.nombre} className="flex items-start justify-between gap-4 border-t border-[#e8e1d2] py-4 first:border-t-0">
                  <div className="min-w-0">
                    <p className="text-base font-medium text-stone-900">{m.nombre}</p>
                    {m.sub && <p className="mt-0.5 text-xs text-stone-400">{m.sub}</p>}
                  </div>
                  <span className="shrink-0 text-base font-semibold text-karuma-700" style={{ fontFamily: SERIF }}>
                    {m.precio}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-xs text-stone-400">Bebidas no incluidas.</p>
          </section>

          {/* HORARIO */}
          <section className="mt-14 border-t border-[#e2dac9] pt-10">
            <Kicker jp="営業時間" es="Horario" />
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900" style={{ fontFamily: SERIF }}>
              Cuándo abrimos
            </h2>
            <div className="mt-6">
              {[
                { jp: "昼", t: "Comida", h: horarioComida, fin: comidaFin },
                { jp: "夜", t: "Cena", h: horarioCena, fin: cenaFin },
              ].map((s) => (
                <div key={s.t} className="border-t border-[#e8e1d2] py-4 first:border-t-0">
                  <div className="flex items-center gap-4">
                    <span className="w-9 shrink-0 text-center text-lg text-karuma-700/80" style={{ fontFamily: KANJI }} aria-hidden>
                      {s.jp}
                    </span>
                    <p className="flex-1 text-base font-semibold text-stone-900">{s.t}</p>
                    <p className="text-base text-stone-700" style={{ fontFamily: SERIF }}>{s.h}</p>
                  </div>
                  <p className="mt-1.5 pl-[3.25rem] text-xs text-stone-400">Última entrada · {s.fin}</p>
                </div>
              ))}
            </div>
          </section>

          {/* UBICACIÓN + GOOGLE MAPS */}
          <section className="mt-14 border-t border-[#e2dac9] pt-10">
            <Kicker jp="アクセス" es="Cómo llegar" />
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900" style={{ fontFamily: SERIF }}>
              Dónde estamos
            </h2>

            <div className="mt-5 rounded-2xl border border-[#ddd4c1] bg-white/60 p-6 text-center">
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-karuma-50 text-karuma-700">
                <MapPin className="h-6 w-6" />
              </span>
              <p className="mt-3 font-semibold text-stone-900">Karuma Sushi &amp; Grill</p>
              <p className="mt-0.5 text-sm text-stone-500">C/ de Roger de Llòria, 2</p>
              <p className="text-sm text-stone-500">46002 València · Ciutat Vella</p>

              <div className="mt-5 flex flex-col gap-2.5">
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl bg-stone-900 py-3.5 text-sm font-semibold text-[#f6f3ec] hover:bg-stone-800"
                >
                  <MapPin className="h-4 w-4" /> Abrir en Google Maps
                </a>
                <a
                  href={DIRECTIONS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-xl border border-stone-300 py-3.5 text-sm font-semibold text-stone-800 hover:border-stone-900"
                >
                  <Navigation className="h-4 w-4" /> Cómo llegar
                </a>
              </div>
            </div>
          </section>

          {/* CONTACTO / REDES */}
          <section className="mt-14 border-t border-[#e2dac9] pt-8">
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-stone-600">
              <a href={`tel:${TELEFONO}`} className="hover:text-karuma-700">Teléfono</a>
              <span className="text-stone-300">·</span>
              <a
                href={`https://wa.me/${WHATSAPP.replace(/\D/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-karuma-700"
              >
                WhatsApp
              </a>
              <span className="text-stone-300">·</span>
              <a
                href="https://www.instagram.com/karuma.valencia"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-karuma-700"
              >
                Instagram
              </a>
              <span className="text-stone-300">·</span>
              <a
                href="https://www.tiktok.com/@karuma.valencia"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-karuma-700"
              >
                TikTok
              </a>
            </div>
          </section>

          {/* PIE */}
          <footer className="mt-12 border-t border-[#e2dac9] py-9 text-center">
            <p className="text-lg font-medium tracking-[0.2em] text-stone-900" style={{ fontFamily: WORDMARK }}>
              KARUMA
            </p>
            <p className="mt-1 text-xs text-stone-400">{DIRECCION}</p>
            <p className="mt-3 text-[11px] text-stone-300">© {new Date().getFullYear()} Karuma Sushi &amp; Grill</p>
          </footer>
        </main>
      </div>
    );
  }

  // ───────────────────── FLUJO DE RESERVA (pasos intermedios) ─────────────────────
  const stepIndex = ["fecha", "servicio", "hora", "datos"].indexOf(step);

  return (
    <div className="min-h-[100dvh] bg-[#f6f3ec] text-stone-900">
      {/* Header compacto */}
      <header className="px-4 pt-6 text-center">
        <button onClick={reiniciar} className="text-lg font-medium tracking-[0.2em] text-stone-900" style={{ fontFamily: WORDMARK }}>
          KARUMA
        </button>
        {/* Progreso */}
        <div className="mx-auto mt-4 flex max-w-[200px] gap-1.5">
          {(["fecha", "servicio", "hora", "datos"] as Step[]).map((s, i) => (
            <div key={s} className={`h-0.5 flex-1 rounded-full transition-colors ${stepIndex >= i ? "bg-karuma-700" : "bg-[#ddd4c1]"}`} />
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-md px-6 py-9">
        {/* PASO 2: fecha */}
        {step === "fecha" && (
          <section>
            <BotonVolver onClick={() => setStep("personas")} />
            <Kicker jp="日にち" es="Fecha" />
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900" style={{ fontFamily: SERIF }}>
              ¿Qué día reservas?
            </h2>
            <p className="mb-6 mt-1 text-sm text-stone-500">Hasta 7 días de antelación</p>

            <div>
              {diasValidos.map(({ valor, etiqueta }) => (
                <button
                  key={valor}
                  onClick={() => { setFecha(valor); setError(""); setStep("servicio"); }}
                  className={`group flex w-full items-center justify-between border-t border-[#e2dac9] py-4 text-left transition-colors last:border-b ${
                    fecha === valor ? "text-karuma-700" : "text-stone-800 hover:text-karuma-700"
                  }`}
                >
                  <span className="text-base font-medium" style={{ fontFamily: SERIF }}>{etiqueta}</span>
                  <ChevronRight className="h-4 w-4 text-stone-300 group-hover:text-karuma-700" />
                </button>
              ))}
            </div>
          </section>
        )}

        {/* PASO 3: servicio */}
        {step === "servicio" && (
          <section>
            <BotonVolver onClick={() => setStep("fecha")} />
            <Kicker jp="昼か夜" es="Servicio" />
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900" style={{ fontFamily: SERIF }}>
              ¿Comida o cena?
            </h2>
            <p className="mb-6 mt-1 text-sm text-stone-500">{formatFecha(fecha)} · {personas} {personas === 1 ? "persona" : "personas"}</p>
            <div className="grid grid-cols-2 gap-4">
              {([
                { s: "comida" as Servicio, jp: "昼", t: "Comida", h: horarioComida },
                { s: "cena" as Servicio, jp: "夜", t: "Cena", h: horarioCena },
              ]).map(({ s, jp, t, h }) => (
                <button
                  key={s}
                  onClick={async () => {
                    setServicio(s);
                    await cargarSlots(fecha, s, personas);
                    setStep("hora");
                  }}
                  className="rounded-2xl border border-[#ddd4c1] bg-white/60 py-8 text-center transition-colors hover:border-karuma-700 hover:bg-white"
                >
                  <span className="text-sm text-stone-400" style={{ fontFamily: KANJI }} aria-hidden>{jp}</span>
                  <p className="mt-2 text-2xl font-semibold text-stone-900" style={{ fontFamily: SERIF }}>{t}</p>
                  <p className="mt-1.5 text-xs text-stone-500">{h}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* PASO 4: hora */}
        {step === "hora" && (
          <section>
            <BotonVolver onClick={() => setStep("servicio")} />
            <Kicker jp="お時間" es="Hora" />
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900" style={{ fontFamily: SERIF }}>
              ¿A qué hora?
            </h2>
            <p className="mb-6 mt-1 text-sm text-stone-500">
              {formatFecha(fecha)} · {servicio === "comida" ? "Comida" : "Cena"} · {personas} {personas === 1 ? "persona" : "personas"}
            </p>
            {loadingSlots ? (
              <div className="py-12 text-center">
                <div className="mx-auto h-7 w-7 animate-spin rounded-full border-2 border-stone-200 border-t-karuma-700" />
                <p className="mt-3 text-sm text-stone-500">Comprobando disponibilidad…</p>
              </div>
            ) : !hayAlgunSlot ? (
              <div className="border-y border-[#e2dac9] py-10 text-center">
                <p className="text-base font-semibold text-stone-700">No hay disponibilidad</p>
                <p className="mt-1 text-sm text-stone-500">Elige otro día o contáctanos.</p>
                <div className="mt-5 flex justify-center gap-2">
                  <a
                    href={`tel:${TELEFONO}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2.5 text-sm font-medium text-[#f6f3ec]"
                  >
                    <Phone className="h-4 w-4" /> Llamar
                  </a>
                  <a
                    href={`https://wa.me/${WHATSAPP.replace(/\D/g, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-stone-300 px-4 py-2.5 text-sm font-medium text-stone-700"
                  >
                    <MessageCircle className="h-4 w-4" /> WhatsApp
                  </a>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2.5">
                {slots.map((s) =>
                  s.disponible ? (
                    <button
                      key={s.hora}
                      onClick={() => { setHora(s.hora); setStep("datos"); }}
                      className={`rounded-xl border py-3.5 text-base font-medium transition-colors ${
                        hora === s.hora
                          ? "border-karuma-700 bg-karuma-700 text-[#f6f3ec]"
                          : "border-[#ddd4c1] bg-white/60 text-stone-900 hover:border-karuma-700 hover:text-karuma-700"
                      }`}
                      style={{ fontFamily: SERIF }}
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
            <BotonVolver onClick={() => setStep("hora")} />
            <Kicker jp="お客様情報" es="Tus datos" />
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900" style={{ fontFamily: SERIF }}>
              Casi está
            </h2>
            <p className="mb-7 mt-1 text-sm text-stone-500">Necesitamos tus datos para confirmar</p>

            <div className="space-y-6">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-400">Nombre completo *</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Tu nombre"
                  className="w-full border-0 border-b border-stone-300 bg-transparent pb-2 text-base text-stone-900 placeholder-stone-300 focus:border-karuma-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-400">Teléfono / WhatsApp *</label>
                <input
                  type="tel"
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  placeholder="+34 600 000 000"
                  className="w-full border-0 border-b border-stone-300 bg-transparent pb-2 text-base text-stone-900 placeholder-stone-300 focus:border-karuma-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-stone-400">Email para confirmación *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  autoComplete="email"
                  className="w-full border-0 border-b border-stone-300 bg-transparent pb-2 text-base text-stone-900 placeholder-stone-300 focus:border-karuma-700 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-stone-400">Notas (opcional)</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Alergias, celebración, silla de bebé…"
                  rows={2}
                  className="w-full border-0 border-b border-stone-300 bg-transparent pb-2 text-base text-stone-900 placeholder-stone-300 focus:border-karuma-700 focus:outline-none"
                />
              </div>
            </div>

            {/* Resumen */}
            <div className="mt-8 border-y border-[#e2dac9] py-2 text-sm">
              <Fila etiqueta="Día y hora" valor={`${formatFecha(fecha)} · ${hora}`} />
              <Fila etiqueta="Personas" valor={String(personas)} />
              <Fila etiqueta="Servicio" valor={servicio === "comida" ? "Comida" : "Cena"} />
            </div>

            {error && (
              <p className="mt-4 border-l-2 border-karuma-700 bg-karuma-50 px-3 py-2 text-sm font-medium text-karuma-800">
                {error}
              </p>
            )}

            <button
              onClick={confirmarReserva}
              disabled={!nombre.trim() || !telefono.trim() || !email.trim() || enviando}
              className="mt-7 w-full rounded-xl bg-karuma-700 py-4 text-base font-semibold text-[#f6f3ec] transition-colors hover:bg-karuma-800 disabled:opacity-40"
            >
              {enviando ? "Confirmando…" : "Confirmar reserva"}
            </button>

            <p className="mt-3 text-center text-xs text-stone-400">
              Al confirmar aceptas que usaremos tu teléfono y email para gestionar tu reserva.
            </p>
          </section>
        )}
      </main>
    </div>
  );
}

// ───────────────────────────── PIEZAS REUTILIZABLES ─────────────────────────────

// Sello hanko (印章): cuadro rojo redondeado con un kanji
function Sello({ char, className = "", big = false }: { char: string; className?: string; big?: boolean }) {
  return (
    <span
      style={{ fontFamily: KANJI }}
      className={`inline-flex items-center justify-center rounded-[10px] bg-karuma-700 text-[#f6f3ec] ring-1 ring-inset ring-white/15 ${
        big ? "h-16 w-16 text-3xl" : "h-11 w-11 text-xl"
      } ${className}`}
      aria-hidden
    >
      {char}
    </span>
  );
}

// Etiqueta de sección: filete rojo + texto en español (primario) + kanji decorativo
function Kicker({ jp, es }: { jp: string; es: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="h-px w-6 bg-karuma-700" />
      <span className="text-xs font-semibold uppercase tracking-[0.28em] text-karuma-700">{es}</span>
      <span className="text-xs text-stone-400" style={{ fontFamily: KANJI }} aria-hidden>{jp}</span>
    </div>
  );
}

// Botón "Volver" minimalista
function BotonVolver({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} className="mb-7 flex items-center gap-1 text-sm text-stone-400 hover:text-stone-700">
      <ChevronLeft className="h-4 w-4" /> Volver
    </button>
  );
}

// Fila etiqueta/valor para los resúmenes
function Fila({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3 py-1.5">
      <span className="shrink-0 text-stone-500">{etiqueta}</span>
      <span className="min-w-0 truncate text-right font-medium text-stone-900">{valor}</span>
    </div>
  );
}
