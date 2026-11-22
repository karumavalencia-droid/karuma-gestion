// Owner-approved prices, effective for visits from 23 November 2026.
export const PRICE_EFFECTIVE_DATE = "2026-11-23";
export const CHILD_PRICE = "12,50 €";
// Official holiday calendars: https://dogv.gva.es/datos/2026/03/25/pdf/2026_8641_es.pdf
// https://www.valencia.es/es/-/fiestas-locales-val%C3%A8ncia-2027
export const HOLIDAYS = new Set([
  "2026-12-06", "2026-12-08", "2026-12-25",
  "2027-01-01", "2027-01-06", "2027-01-22", "2027-03-19",
  "2027-03-26", "2027-03-29", "2027-04-05", "2027-05-01",
  "2027-10-09", "2027-10-12", "2027-11-01", "2027-12-06",
  "2027-12-08", "2027-12-25",
]);
export function precioBuffet(fecha: string, hora: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !/^\d{2}:\d{2}/.test(hora)) return "Consultar";
  const date = new Date(`${fecha}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== fecha) return "Consultar";
  const [h, m] = hora.split(":").map(Number);
  if (h > 23 || m > 59) return "Consultar";
  const dow = date.getUTCDay();
  const lunch = h * 60 + m < 16 * 60 + 30;
  if (fecha < PRICE_EFFECTIVE_DATE) return dow >= 1 && dow <= 5 && lunch ? "19,90 €" : "24,90 €";
  // Update the holiday calendar before quoting bookings beyond 2027.
  if (fecha > "2027-12-31") return "Consultar";
  if (HOLIDAYS.has(fecha) || dow === 0 || dow === 6 || (dow === 5 && !lunch)) return "26,50 €";
  return lunch ? "19,90 €" : "24,90 €";
}
export const BUFFET_MENUS = [
  { name: "Buffet comida", price: "19,90 €", detail: "Lunes a viernes al mediodía, excepto festivos" },
  { name: "Buffet noche", price: "24,90 €", detail: "Lunes a jueves por la noche, excepto festivos" },
  { name: "Buffet fin de semana y festivos", price: "26,50 €", detail: "Viernes noche, sábados, domingos y festivos todo el día" },
  { name: "Menú infantil", price: CHILD_PRICE, detail: "Para los más pequeños" },
];
