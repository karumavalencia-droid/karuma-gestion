// Festivos que cuentan como tarifa de fin de semana en Karuma (Valencia ciudad):
// nacionales, de la Comunitat Valenciana y los dos locales de València.
// Fuente: Decreto 100/2025 (calendario 2026), Decreto 42/2026 (calendario 2027) y
// festivos locales aprobados por el Ayuntamiento de València.
// Para años sin lista oficial se calcula con las fiestas fijas y las de Pascua.

const OFICIALES: Record<number, string[]> = {
  2026: [
    "2026-01-01", "2026-01-06", "2026-01-22", "2026-03-19", "2026-04-03", "2026-04-06", "2026-04-13",
    "2026-05-01", "2026-06-24", "2026-08-15", "2026-10-09", "2026-10-12", "2026-12-08", "2026-12-25",
  ],
  2027: [
    "2027-01-01", "2027-01-06", "2027-01-22", "2027-03-19", "2027-03-26", "2027-03-29", "2027-04-05",
    "2027-05-01", "2027-10-09", "2027-10-12", "2027-11-01", "2027-12-06", "2027-12-08", "2027-12-25",
  ],
};

function iso(y: number, m: number, d: number): string {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

// Domingo de Pascua (algoritmo de Meeus/Butcher)
function pascua(y: number): Date {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31), dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(y, mes - 1, dia));
}
function masDias(d: Date, n: number): string {
  const x = new Date(d); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10);
}

function calculados(y: number): string[] {
  const p = pascua(y);
  return [
    iso(y, 1, 1), iso(y, 1, 6), iso(y, 1, 22), iso(y, 3, 19), iso(y, 5, 1), iso(y, 8, 15),
    iso(y, 10, 9), iso(y, 10, 12), iso(y, 11, 1), iso(y, 12, 6), iso(y, 12, 8), iso(y, 12, 25),
    masDias(p, -2), // Viernes Santo
    masDias(p, 1),  // Lunes de Pascua
    masDias(p, 8),  // San Vicente Ferrer (local, lunes siguiente al de Pascua)
  ];
}

const cache = new Map<number, Set<string>>();
export function esFestivo(fecha: string): boolean {
  const y = Number(fecha.slice(0, 4));
  if (!Number.isFinite(y)) return false;
  let set = cache.get(y);
  if (!set) { set = new Set(OFICIALES[y] ?? calculados(y)); cache.set(y, set); }
  return set.has(fecha.slice(0, 10));
}

// Tarifa especial de Navidad y Año Nuevo (todos los años): 29,90 €.
// Nochebuena y Nochevieja solo en cena; Navidad y Año Nuevo todo el día.
export const PRECIO_ESPECIAL = "29,90 €";
export function esDiaEspecial(fecha: string): boolean {
  const md = fecha.slice(5, 10);
  return md === "12-24" || md === "12-25" || md === "12-31" || md === "01-01";
}
export function esTarifaEspecial(fecha: string, mediodia: boolean): boolean {
  const md = fecha.slice(5, 10);
  if (md === "12-25" || md === "01-01") return true;
  return !mediodia && (md === "12-24" || md === "12-31");
}
