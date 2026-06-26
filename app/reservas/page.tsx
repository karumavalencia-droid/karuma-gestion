"use client";

import { useState, useEffect, useMemo } from "react";
import { Phone, MessageCircle, MapPin, Navigation, ChevronLeft, ChevronRight, ChevronDown, Clock } from "lucide-react";

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

// Precio del buffet por persona según día y hora (regla de Karuma, calculada en cliente):
// Mediodía = lunes a viernes de 13:00 a 16:30 → 19,90 €. Resto (tardes, noches,
// fines de semana y festivos) → 24,90 €. No detecta festivos puntuales (esos son 24,90 €).
function precioBuffet(fecha: string, hora: string): string {
  if (!fecha || !hora) return "24,90 €";
  const dow = new Date(fecha + "T12:00:00").getDay(); // 0=Dom … 6=Sáb
  const [h, m] = hora.split(":").map(Number);
  const esMediodiaLaborable = dow >= 1 && dow <= 5 && h * 60 + m < 16 * 60 + 30;
  return esMediodiaLaborable ? "19,90 €" : "24,90 €";
}

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

// Carta completa (importada del menú de Karuma · RestoSuite). Orientativa.
interface PlatoCarta { n: string; d?: string; p: string }
const CARTA: { cat: string; items: PlatoCarta[] }[] = [
  {
    cat: "Entrantes fríos",
    items: [
      { n: "Carpaccio de atún en salsa ponzu", d: "Atún, salsa ponzu, cebollino", p: "3,95 €" },
      { n: "Carpaccio de salmón en salsa ponzu", d: "Salmón, salsa ponzu, cebollino", p: "3,95 €" },
      { n: "Carpaccio de salmón en salsa maracuyá", p: "3,95 €" },
      { n: "Ensalada de la casa", d: "Lechuga, cebolla, pepino, mango, ponzu, salsa de mostaza y miel, sésamo", p: "3,95 €" },
      { n: "Ensalada de pollo crujiente", d: "Pollo, aguacate, ponzu, salsa de maracuyá, mostaza y miel, sésamo", p: "3,95 €" },
      { n: "Ensalada de langostino tempura", d: "Langostino, aguacate, ponzu, salsa de maracuyá, mostaza y miel, sésamo", p: "3,95 €" },
      { n: "Ensalada de salmón ahumado", p: "4,50 €" },
      { n: "Wakame", d: "Wakame, pepino, sésamo", p: "3,50 €" },
      { n: "Edamame", p: "3,50 €" },
      { n: "Wontón de salmón", d: "Wontón crujiente, tartar de salmón, queso crema, salsa teriyaki, cebollino", p: "3,95 €" },
      { n: "Alistada de gamba", p: "3,95 €" },
    ],
  },
  {
    cat: "Entrantes calientes",
    items: [
      { n: "Sopa miso", d: "Tofu, cebolla, pimiento verde y rojo, alga wakame", p: "3,95 €" },
      { n: "Takoyaki", d: "Salsa mayo teriyaki, virutas de bonito", p: "4,50 €" },
      { n: "Croqueta", p: "4,50 €" },
      { n: "Alita original", d: "Alita, salsa mayonesa", p: "3,95 €" },
      { n: "Alita picante", d: "Alita picante, mayonesa japonesa", p: "4,20 €" },
      { n: "Alita miel y mostaza", d: "Alita, salsa de miel y mostaza", p: "4,20 €" },
      { n: "Rollo primavera (3 ud)", d: "Repollo, guisantes, zanahoria, fideos, cebolla, soja, aceite de sésamo", p: "3,90 €" },
      { n: "Langostino tempura", d: "Langostino en tempura, salsa chile dulce", p: "4,50 €" },
      { n: "Pollo karaage", d: "Pollo marinado y rebozado, salsa chile dulce", p: "4,50 €" },
      { n: "Torrezno con mango", d: "Torrezno, mango, salsa de mango", p: "4,50 €" },
      { n: "Pollo al limón", d: "Pollo, salsa de limón", p: "4,80 €" },
      { n: "Costilla de maíz", d: "Maíz horneado, sal, aceite", p: "3,90 €" },
      { n: "Brocheta de pollo teriyaki", p: "3,90 €" },
    ],
  },
  {
    cat: "Baos y dim sum",
    items: [
      { n: "Bao de chorizo criollo", d: "Chorizo criollo a la brasa, pepino encurtido, mézclum, mayo chimichurri", p: "4,50 €" },
      { n: "Bao pulled pork", d: "Pulled pork, mézclum, pepino encurtido, spicy mayo", p: "3,90 €" },
      { n: "Bao de langostino", d: "Langostino, lechuga, mézclum, salsa mayo trufa", p: "3,90 €" },
      { n: "Bao de pollo", d: "Contramuslo a la brasa, lechuga, mézclum, mayo japonesa", p: "3,90 €" },
      { n: "Xiaolong bao", d: "Carne de cerdo", p: "3,50 €" },
      { n: "Shumai de cerdo", p: "3,50 €" },
      { n: "Gyoza al vapor", d: "Carne de pollo", p: "3,50 €" },
      { n: "Gyoza frita", d: "Carne de pollo, salsa pesto", p: "3,50 €" },
    ],
  },
  {
    cat: "Salteados",
    items: [
      { n: "Arroz frito", d: "Arroz, maíz, guisantes, zanahoria, huevo", p: "5,90 €" },
      { n: "Tallarines fritos", d: "Fideos, zanahoria, brotes de soja, cebolla, bok choy, huevo", p: "5,90 €" },
      { n: "Champiñón con salsa miso", p: "4,50 €" },
    ],
  },
  {
    cat: "A la brasa",
    items: [
      { n: "Secreto ibérico", d: "Secreto ibérico a la parrilla, patata frita", p: "5,90 €" },
      { n: "Entrecot", d: "Entrecot a la parrilla, patata frita", p: "6,50 €" },
      { n: "Costilla de cerdo", d: "Costilla de cerdo, patata frita", p: "4,50 €" },
      { n: "Contramuslo de pollo", d: "Pollo a la parrilla, patata frita", p: "4,20 €" },
      { n: "Chorizo criollo", d: "Chorizo criollo a la parrilla, patata frita", p: "4,90 €" },
      { n: "Churrasco", p: "4,50 €" },
      { n: "Gamba al ajillo", d: "Gamba a la parrilla, salsa mery (ajo, perejil, guindilla, aceite)", p: "5,90 €" },
      { n: "Almeja", d: "Almeja a la parrilla, salsa mery", p: "5,50 €" },
      { n: "Vieira", d: "Vieira a la parrilla, salsa mery", p: "4,50 €" },
      { n: "Puerro a la brasa", p: "4,50 €" },
      { n: "Piña a la brasa", p: "4,50 €" },
    ],
  },
  {
    cat: "Nigiri",
    items: [
      { n: "Nigiri salmón", p: "3,50 €" },
      { n: "Nigiri salmón flameado", d: "Salmón flameado, teriyaki, cebollino", p: "3,90 €" },
      { n: "Nigiri salmón cheese flameado", d: "Salmón flameado, queso mascarpone, teriyaki, tobiko", p: "3,90 €" },
      { n: "Nigiri atún", p: "3,90 €" },
      { n: "Nigiri atún flameado", d: "Atún flameado, teriyaki, cebollino", p: "3,90 €" },
      { n: "Nigiri atún cheese", d: "Atún flameado, salsa de mascarpone, salsa de azafrán, tobiko", p: "3,90 €" },
      { n: "Nigiri anguila", d: "Anguila flameada, teriyaki, sésamo", p: "3,90 €" },
      { n: "Nigiri ebi", d: "Ebi, queso, teriyaki, kataifi", p: "3,90 €" },
    ],
  },
  {
    cat: "Maki",
    items: [
      { n: "Maki salmón", p: "3,90 €" },
      { n: "Maki atún", p: "3,90 €" },
      { n: "Maki aguacate", p: "3,50 €" },
      { n: "Maki pepino", p: "3,50 €" },
      { n: "Maki tempura salmón", d: "Salmón cocido, tartar de salmón, teriyaki, kataifi", p: "4,90 €" },
      { n: "Maki tempura fresa", d: "Salmón cocido, queso, fresa, salsa de fresa", p: "4,90 €" },
      { n: "Maki tempura mango", d: "Salmón cocido, queso, mango, salsa de mango", p: "4,90 €" },
      { n: "Combo 1", p: "9,50 €" },
      { n: "Combo 2", p: "14,50 €" },
    ],
  },
  {
    cat: "Uramaki",
    items: [
      { n: "Uramaki salmón", d: "Salmón, aguacate, queso, sésamo, teriyaki, cebollino", p: "4,50 €" },
      { n: "Crazy salmón", d: "Relleno de salmón y aguacate, salmón flameado, teriyaki, kataifi", p: "4,90 €" },
      { n: "Spicy salmón", d: "Relleno de salmón y aguacate, tartar de salmón picante, mayonesa, kataifi", p: "4,90 €" },
      { n: "Samba salmón", d: "Salmón, aguacate, queso, tobiko, salsa de azafrán", p: "4,90 €" },
      { n: "Uramaki atún", d: "Relleno de atún y aguacate, queso, sésamo, cebollino", p: "4,90 €" },
      { n: "Spicy tuna", d: "Relleno de atún y aguacate, tartar de salmón picante, mayonesa, kataifi", p: "4,90 €" },
      { n: "Foxy surimi", d: "Aguacate, palitos de cangrejo, salmón flameado, mayonesa, teriyaki, kataifi", p: "4,90 €" },
      { n: "Dragon roll", d: "Tempura de langostino, queso, aguacate, tobiko, teriyaki", p: "4,90 €" },
      { n: "Tiger roll", d: "Tempura de langostino, aguacate, salmón, queso, mayo trufa, cebollino", p: "4,90 €" },
      { n: "Ebi cheese", d: "Ebi tempura, queso brie caramelizado, mascarpone, teriyaki, tobiko", p: "4,90 €" },
      { n: "Crazy surimi", d: "Palito de cangrejo, aguacate, salmón, mango, ponzu, mayonesa, kataifi", p: "4,50 €" },
      { n: "Veggie roll", d: "Pepino, aguacate, queso, teriyaki, kataifi", p: "4,50 €" },
      { n: "Pollo cheese", d: "Pollo rebozado, aguacate, queso cheddar, kataifi, salsa miel y mostaza", p: "4,50 €" },
      { n: "Love roll", p: "4,90 €" },
    ],
  },
  {
    cat: "Gunkan y temaki",
    items: [
      { n: "Gunkan salmón", d: "Tartar de salmón, cebollino, arroz, alga nori", p: "3,90 €" },
      { n: "Gunkan atún", d: "Tartar de atún, cebollino, arroz, alga nori", p: "3,90 €" },
      { n: "Gunkan tobiko", d: "Arroz, alga nori, huevas de tobiko", p: "3,90 €" },
      { n: "Temaki salmón", d: "Salmón, aguacate, queso, teriyaki, sésamo", p: "3,90 €" },
      { n: "Temaki atún", d: "Atún, aguacate, queso, teriyaki, sésamo", p: "3,90 €" },
      { n: "Temaki langostino", d: "Tempura de langostino, aguacate, queso, mayo trufa, sésamo", p: "3,90 €" },
      { n: "Temaki vegano", d: "Pepino, aguacate, salsa de pesto", p: "3,50 €" },
    ],
  },
  {
    cat: "Tartar",
    items: [
      { n: "Tartar de salmón", d: "Arroz, aguacate, salmón, ponzu, teriyaki, sésamo", p: "4,50 €" },
      { n: "Tartar de atún", d: "Arroz, aguacate, atún, ponzu, teriyaki, sésamo", p: "4,50 €" },
    ],
  },
  {
    cat: "Postres",
    items: [
      { n: "Mochi (fresa o té matcha · 2 u)", p: "3,95 €" },
      { n: "Coulant de chocolate", p: "4,95 €" },
      { n: "Helado de vainilla", p: "2,00 €" },
    ],
  },
  {
    cat: "Refrescos",
    items: [
      { n: "Agua", p: "1,90 €" },
      { n: "Agua con gas", p: "2,95 €" },
      { n: "Coca-Cola", p: "2,95 €" },
      { n: "Coca-Cola Zero", p: "2,95 €" },
      { n: "Fanta Limón", p: "2,95 €" },
      { n: "Aquarius Limón", p: "2,90 €" },
      { n: "Aquarius Naranja", p: "2,95 €" },
      { n: "Fuze Tea", p: "2,95 €" },
      { n: "Fuze Tea Maracuyá", p: "2,95 €" },
    ],
  },
  {
    cat: "Cervezas",
    items: [
      { n: "Amstel", p: "2,90 €" },
      { n: "Cerveza con limón", p: "2,95 €" },
      { n: "Kirin Ichiban", p: "3,50 €" },
    ],
  },
  {
    cat: "Vinos y licores",
    items: [
      { n: "Copa de vino tinto", p: "2,80 €" },
      { n: "Copa de vino blanco", p: "2,80 €" },
      { n: "Botella vino tinto", p: "7,50 €" },
      { n: "Botella vino blanco", p: "7,50 €" },
      { n: "Ramón Bilbao tinto", p: "16,80 €" },
      { n: "Ramón Bilbao blanco", p: "16,80 €" },
      { n: "Sanz blanco", p: "15,80 €" },
      { n: "Pago de los Capellanes", p: "44 €" },
      { n: "Chupito Beefeater", p: "2,50 €" },
      { n: "Chupito Red Label", p: "2,50 €" },
      { n: "Chupito whisky escocés", p: "2,50 €" },
    ],
  },
  {
    cat: "Cafés",
    items: [
      { n: "Café solo", p: "1,70 €" },
      { n: "Cortado", p: "1,90 €" },
      { n: "Café con leche", p: "2,20 €" },
      { n: "Bombón", p: "1,90 €" },
      { n: "Capuchino", p: "2,20 €" },
      { n: "Café solo descafeinado", p: "1,70 €" },
      { n: "Cortado descafeinado", p: "1,90 €" },
      { n: "Café con leche descafeinado", p: "2,20 €" },
      { n: "Bombón descafeinado", p: "1,90 €" },
    ],
  },
];

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
  const [cartaAbierta, setCartaAbierta] = useState<string | null>(null);

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
            <Fila etiqueta="Precio buffet" valor={`${precioBuffet(fecha, hora)} / persona`} />
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
            <p className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-karuma-700/30 bg-karuma-50/70 px-3 py-1 text-xs font-semibold text-karuma-700">
              <Clock className="h-3.5 w-3.5" /> Todos los días · 13:00–23:30
            </p>
          </div>
        </header>

        <main className="mx-auto max-w-md px-6">
          {/* HORARIO Y PRECIOS — destacado, encima del formulario de reserva */}
          <section className="border-t border-[#e2dac9] pt-10">
            <Kicker jp="営業時間" es="Horario" />
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900" style={{ fontFamily: SERIF }}>
              Horario y precios
            </h2>

            <div className="mt-5 overflow-hidden rounded-2xl border-2 border-karuma-700/30 bg-karuma-50/60">
              <div className="border-b border-karuma-700/15 px-5 py-5 text-center">
                <p className="inline-flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.28em] text-karuma-700">
                  <Clock className="h-3.5 w-3.5" /> Abierto todos los días
                </p>
                <p className="mt-2 text-[1.9rem] font-semibold leading-none text-stone-900" style={{ fontFamily: SERIF }}>
                  13:00 – 23:30
                </p>
                <p className="mt-2 text-xs text-stone-500">Cocina ininterrumpida</p>
              </div>
              <div className="px-5 py-1">
                {[
                  { t: "Mediodía", sub: "Lunes a viernes · 13:00 – 16:30", precio: "19,90 €" },
                  { t: "Tarde, noche, fines de semana y festivos", sub: "", precio: "24,90 €" },
                  { t: "Niños", sub: "Menú infantil", precio: "12,50 €" },
                ].map((p) => (
                  <div key={p.t} className="flex items-start justify-between gap-4 border-t border-karuma-700/15 py-3.5 first:border-t-0">
                    <div className="min-w-0">
                      <p className="text-[0.95rem] font-semibold text-stone-900">{p.t}</p>
                      {p.sub && <p className="mt-0.5 text-xs text-stone-500">{p.sub}</p>}
                    </div>
                    <span className="shrink-0 text-base font-semibold text-karuma-700" style={{ fontFamily: SERIF }}>
                      {p.precio}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-3 text-center text-xs text-stone-400">Buffet libre · bebidas no incluidas.</p>
          </section>

          {/* RESERVA */}
          <section className="mt-14 border-t border-[#e2dac9] pt-10">
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

          {/* CARTA COMPLETA */}
          <section className="mt-14 border-t border-[#e2dac9] pt-10">
            <Kicker jp="お品書き" es="Carta" />
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-stone-900" style={{ fontFamily: SERIF }}>
              Nuestra carta
            </h2>
            <p className="mb-5 mt-1 text-sm text-stone-500">Toca una categoría para ver los platos</p>

            <div className="overflow-hidden rounded-2xl border border-[#ddd4c1] bg-white/50">
              {CARTA.map((c, idx) => {
                const abierta = cartaAbierta === c.cat;
                return (
                  <div key={c.cat} className={idx > 0 ? "border-t border-[#e8e1d2]" : ""}>
                    <button
                      onClick={() => setCartaAbierta(abierta ? null : c.cat)}
                      className="flex w-full items-center justify-between px-4 py-3.5 text-left"
                      aria-expanded={abierta}
                    >
                      <span className="text-[0.95rem] font-semibold text-stone-900">{c.cat}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-stone-400">{c.items.length}</span>
                        <ChevronDown className={`h-4 w-4 text-stone-400 transition-transform ${abierta ? "rotate-180" : ""}`} />
                      </span>
                    </button>
                    {abierta && (
                      <div className="px-4 pb-2">
                        {c.items.map((it, i) => (
                          <div key={`${c.cat}-${i}`} className="flex items-start justify-between gap-4 border-t border-[#efe9dc] py-3 first:border-t-0">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-stone-900">{it.n}</p>
                              {it.d && <p className="mt-0.5 text-xs leading-snug text-stone-400">{it.d}</p>}
                            </div>
                            <span className="shrink-0 text-sm font-semibold text-karuma-700" style={{ fontFamily: SERIF }}>{it.p}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-xs text-stone-400">Carta orientativa · pueden existir variaciones. Las bebidas no están incluidas en el buffet.</p>
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
              <Fila etiqueta="Precio buffet" valor={`${precioBuffet(fecha, hora)} / persona`} />
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
