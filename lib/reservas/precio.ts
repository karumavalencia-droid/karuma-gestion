import { esFestivo, esTarifaEspecial, PRECIO_ESPECIAL } from "@/lib/reservas/festivos";

export const PRECIO_FIN_DE_SEMANA = "26,50 €";

// Precio del buffet por persona según día y hora (regla de Karuma):
// Mediodía de lunes a viernes (13:00–17:00) → 19,90 €. Noche de lunes a jueves → 24,90 €.
// Viernes noche, sábado, domingo y festivos (nacionales, autonómicos y locales de València) → 26,50 €.
// Nochebuena y Nochevieja (cena), Navidad y Año Nuevo (todo el día) → 29,90 €.
export function precioBuffet(fecha: string, hora: string): string {
  if (!fecha || !hora) return "24,90 €";
  const dow = new Date(fecha + "T12:00:00").getDay(); // 0=Dom … 6=Sáb
  const [h, m] = hora.split(":").map(Number);
  const mediodia = h * 60 + m < 17 * 60;
  if (esTarifaEspecial(fecha, mediodia)) return PRECIO_ESPECIAL;
  if (dow === 0 || dow === 6 || (dow === 5 && !mediodia) || esFestivo(fecha)) return PRECIO_FIN_DE_SEMANA;
  return mediodia ? "19,90 €" : "24,90 €";
}
