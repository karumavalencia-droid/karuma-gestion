"use client";

import { useEffect, useState } from "react";

type Locale = "es" | "en";

const STORAGE_KEY = "karuma-reservation-language";

const TEXT_EN: Record<string, string> = {
  "Cocina japonesa, brasa y buffet libre en el corazón de Valencia.": "Japanese cuisine, charcoal grill and all-you-can-eat buffet in the heart of Valencia.",
  "Todos los días · 13:00–23:30": "Every day · 13:00–23:30",
  "Reserva": "Booking",
  "Reserva tu mesa": "Book your table",
  "persona": "guest",
  "personas": "guests",
  "Llamar": "Call",
  "Horario": "Opening hours",
  "Horario y precios": "Opening hours & prices",
  "Abierto todos los días": "Open every day",
  "Cocina ininterrumpida": "Kitchen open all day",
  "Mediodía": "Lunch",
  "Lunes a viernes · 13:00 – 16:30": "Monday to Friday · 13:00 – 16:30",
  "Tarde, noche, fines de semana y festivos": "Afternoon, evening, weekends & public holidays",
  "Niños": "Children",
  "Menú infantil": "Kids menu",
  "Buffet libre · bebidas no incluidas.": "All-you-can-eat buffet · drinks not included.",
  "Sobre Karuma": "About Karuma",
  "El sabor de Japón, hecho al momento": "The taste of Japan, freshly made",
  "En Karuma reunimos lo mejor de la cocina japonesa: sushi fresco preparado al momento, carnes y pescados a la brasa y un buffet libre para disfrutar sin límites. Un espacio sereno en el centro de Valencia donde cada plato se cuida al detalle.": "At Karuma we bring together the best of Japanese cuisine: freshly prepared sushi, grilled meat and fish, and an all-you-can-eat buffet to enjoy without limits. A relaxed space in central Valencia where every dish is prepared with care.",
  "Sushi fresco": "Fresh sushi",
  "Elaborado al momento": "Freshly prepared",
  "A la brasa": "From the grill",
  "Carnes y pescados": "Meat & fish",
  "Buffet libre": "All-you-can-eat",
  "Sin límites": "No limits",
  "Carta": "Menu",
  "Nuestra carta": "Our menu",
  "Toca una categoría para ver los platos": "Tap a category to see the dishes",
  "Entrantes fríos": "Cold starters",
  "Entrantes calientes": "Hot starters",
  "Baos y dim sum": "Bao & dim sum",
  "Salteados": "Stir-fried dishes",
  "Carta orientativa · pueden existir variaciones. Las bebidas no están incluidas en el buffet.": "Menu for reference · dishes may vary. Drinks are not included in the buffet.",
  "Cómo llegar": "Directions",
  "Dónde estamos": "Find us",
  "Abrir en Google Maps": "Open in Google Maps",
  "Teléfono": "Phone",
  "Volver": "Back",
  "Fecha": "Date",
  "¿Qué día reservas?": "Which day would you like to book?",
  "Hasta 7 días de antelación": "Book up to 7 days in advance",
  "Servicio": "Service",
  "¿Comida o cena?": "Lunch or dinner?",
  "Comida": "Lunch",
  "Cena": "Dinner",
  "Hora": "Time",
  "¿A qué hora?": "What time?",
  "Comprobando disponibilidad…": "Checking availability…",
  "Estás en la lista de espera": "You are on the waiting list",
  "Lista de espera": "Waiting list",
  "Déjanos tu contacto y te avisamos si queda mesa libre.": "Leave your contact details and we’ll let you know if a table becomes available.",
  "Tu nombre *": "Your name *",
  "Teléfono / WhatsApp *": "Phone / WhatsApp *",
  "Apuntando…": "Joining…",
  "Apuntarme": "Join waiting list",
  "No hay disponibilidad": "No availability",
  "Elige otro día, contáctanos o apúntate a la lista de espera.": "Choose another day, contact us or join the waiting list.",
  "Tus datos": "Your details",
  "Casi está": "Almost there",
  "Necesitamos tus datos para confirmar": "We need your details to confirm the booking",
  "Nombre completo *": "Full name *",
  "Tu nombre": "Your name",
  "Email para confirmación *": "Email for confirmation *",
  "Notas (opcional)": "Notes (optional)",
  "Alergias, celebración, silla de bebé…": "Allergies, celebration, high chair…",
  "Día y hora": "Date & time",
  "Personas": "Guests",
  "Precio buffet": "Buffet price",
  "Nombre": "Name",
  "Mesa": "Table",
  "Nº reserva": "Booking no.",
  "Confirmando…": "Confirming…",
  "Confirmar reserva": "Confirm booking",
  "Al confirmar aceptas que usaremos tu teléfono y email para gestionar tu reserva.": "By confirming, you agree that we may use your phone number and email to manage your booking.",
  "Reserva confirmada": "Booking confirmed",
  "Guarda esta pantalla como confirmación de tu reserva.": "Keep this screen as confirmation of your booking.",
  "Hacer otra reserva": "Make another booking",
  "El teléfono es obligatorio": "Phone number is required",
  "El email es obligatorio para enviar la confirmación": "Email is required to send the confirmation",
  "Introduce un email válido": "Enter a valid email address",
  "Error al reservar": "Booking error",
  "Necesitamos tu nombre y teléfono para avisarte.": "We need your name and phone number to contact you.",
  "No se pudo apuntar a la lista de espera": "Could not join the waiting list",
};

const MONTHS: Record<string, string> = {
  enero: "January", febrero: "February", marzo: "March", abril: "April", mayo: "May", junio: "June",
  julio: "July", agosto: "August", septiembre: "September", octubre: "October", noviembre: "November", diciembre: "December",
};
const DAYS: Record<string, string> = {
  Domingo: "Sunday", Lunes: "Monday", Martes: "Tuesday", Miércoles: "Wednesday", Jueves: "Thursday", Viernes: "Friday", Sábado: "Saturday",
};

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "es" || saved === "en") return saved;
  } catch { /* ignore storage errors */ }
  const preferred = navigator.languages?.[0] ?? navigator.language ?? "";
  return preferred.toLowerCase().startsWith("es") ? "es" : "en";
}

function englishText(value: string): string {
  const exact = TEXT_EN[value];
  if (exact) return exact;

  let text = value;
  text = text.replace(/^En menos de un minuto · hasta (\d+) personas online$/, "In under a minute · up to $1 guests online");
  text = text.replace(/^¿Sois más de (\d+)\? Para grupos grandes, llámanos o escríbenos por WhatsApp\.$/, "More than $1 guests? For large groups, call us or message us on WhatsApp.");
  text = text.replace(/^Hemos enviado la confirmación a (.+)$/, "We sent the confirmation to $1");
  text = text.replace(/^Si queda una mesa libre para (\d+) persona(s)? te\s*llamaremos o escribiremos por WhatsApp al (.+)\.$/, "If a table becomes available for $1 guest$2, we’ll call or message you on WhatsApp at $3.");
  text = text.replace(/(\d+) personas\b/g, "$1 guests").replace(/(\d+) persona\b/g, "$1 guest");
  text = text.replace(/\/ persona\b/g, "/ guest");
  text = text.replace(/^Hoy, /, "Today, ").replace(/^Mañana, /, "Tomorrow, ");
  for (const [es, en] of Object.entries(DAYS)) text = text.replace(new RegExp(`^${es}, `), `${en}, `);
  for (const [es, en] of Object.entries(MONTHS)) text = text.replace(new RegExp(` de ${es}\\b`, "g"), ` ${en}`);
  text = text.replace(/ · Comida · /g, " · Lunch · ").replace(/ · Cena · /g, " · Dinner · ");
  return text;
}

function translateNode(node: Text, locale: Locale) {
  if (!originalText.has(node)) originalText.set(node, node.nodeValue ?? "");
  const source = originalText.get(node) ?? "";
  const leading = source.match(/^\s*/)?.[0] ?? "";
  const trailing = source.match(/\s*$/)?.[0] ?? "";
  const core = source.trim();
  if (!core) return;
  node.nodeValue = locale === "en" ? `${leading}${englishText(core)}${trailing}` : source;
}

function translateElement(element: Element, locale: Locale) {
  for (const attr of ["placeholder", "aria-label", "title"]) {
    const current = element.getAttribute(attr);
    if (current == null) continue;
    let saved = originalAttributes.get(element);
    if (!saved) {
      saved = new Map();
      originalAttributes.set(element, saved);
    }
    if (!saved.has(attr)) saved.set(attr, current);
    const source = saved.get(attr) ?? current;
    element.setAttribute(attr, locale === "en" ? englishText(source) : source);
  }
}

function applyLocale(root: Element, locale: Locale) {
  root.setAttribute("lang", locale);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    translateNode(node as Text, locale);
    node = walker.nextNode();
  }
  root.querySelectorAll("input, textarea, button, a").forEach((el) => translateElement(el, locale));
}

export default function ReservationLanguage() {
  const [locale, setLocale] = useState<Locale>("es");

  useEffect(() => {
    setLocale(detectLocale());
  }, []);

  useEffect(() => {
    const root = document.querySelector("[data-reservation-root]");
    if (!root) return;

    document.documentElement.lang = locale;
    applyLocale(root, locale);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((added) => {
          if (added.nodeType === Node.TEXT_NODE) translateNode(added as Text, locale);
          if (added.nodeType === Node.ELEMENT_NODE) applyLocale(added as Element, locale);
        });
      }
    });
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [locale]);

  const choose = (next: Locale) => {
    try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore storage errors */ }
    setLocale(next);
  };

  return (
    <div
      data-reservation-language-control
      className="fixed right-3 top-3 z-[100] flex overflow-hidden rounded-full border border-stone-300 bg-[#f6f3ec]/95 p-0.5 text-xs font-semibold shadow-sm backdrop-blur"
      role="group"
      aria-label="Language / Idioma"
    >
      <button
        type="button"
        onClick={() => choose("es")}
        className={`rounded-full px-3 py-1.5 ${locale === "es" ? "bg-stone-900 text-white" : "text-stone-600"}`}
        aria-pressed={locale === "es"}
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => choose("en")}
        className={`rounded-full px-3 py-1.5 ${locale === "en" ? "bg-stone-900 text-white" : "text-stone-600"}`}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
    </div>
  );
}
