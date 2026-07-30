// ─── Validación de entrada + CSRF + validación de ficheros ────────────────────
// Reglas defensivas para la zona privada. Todo lo que entra se valida en el
// servidor; nunca se confía en el cliente.

export const MAX_STRING = 500;
export const MAX_NOTES = 2000;

/** Rechaza mutaciones cuyo Origin no coincide con el Host (defensa CSRF). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  // Para mutaciones exigimos Origin. Los navegadores lo envían en POST/PATCH/DELETE.
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function asString(value: unknown, max = MAX_STRING): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > max) return null;
  return trimmed;
}

export function asOptionalString(value: unknown, max = MAX_NOTES): string | null {
  if (value === undefined || value === null || value === "") return null;
  return asString(value, max);
}

/** Importe en céntimos: entero, no NaN, dentro de un rango razonable. */
export function asAmountCents(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n)) return null;
  if (n < -1_000_000_000_00 || n > 1_000_000_000_00) return null;
  return n;
}

/** Fecha ISO YYYY-MM-DD válida. */
export function asIsoDate(value: unknown): string | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(value + "T12:00:00Z");
  return Number.isNaN(d.getTime()) ? null : value;
}

/** Periodo YYYY-MM. */
export function asPeriod(value: unknown): string | null {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value) ? value : null;
}

export function asEnum<T extends string>(value: unknown, allowed: readonly T[]): T | null {
  return typeof value === "string" && (allowed as readonly string[]).includes(value)
    ? (value as T)
    : null;
}

// ── Validación de ficheros (documentos financieros) ──────────────────────────

export const ALLOWED_DOC_MIME = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const MAX_DOC_BYTES = 15 * 1024 * 1024; // 15 MB

const MIME_EXT: Record<string, string> = {
  "application/pdf": "pdf",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export interface FileCheckResult {
  ok: boolean;
  error?: string;
  ext?: string;
}

/** Valida MIME y tamaño de un fichero subido. */
export function checkUploadFile(file: { type: string; size: number }): FileCheckResult {
  if (!(ALLOWED_DOC_MIME as readonly string[]).includes(file.type)) {
    return { ok: false, error: "Tipo de archivo no permitido (solo PDF o imagen)." };
  }
  if (file.size <= 0 || file.size > MAX_DOC_BYTES) {
    return { ok: false, error: "El archivo supera el tamaño máximo (15 MB)." };
  }
  return { ok: true, ext: MIME_EXT[file.type] };
}

/**
 * Sanea un nombre de fichero: quita rutas, caracteres peligrosos y evita el
 * path traversal. Devuelve solo el nombre base seguro.
 */
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "archivo";
  const cleaned = base
    .replace(/[^\w.\- ]+/g, "_")
    .replace(/\.{2,}/g, ".")
    .replace(/^\.+/, "")
    .trim()
    .slice(0, 120);
  return cleaned || "archivo";
}

/**
 * Verifica que una ruta de storage está dentro del prefijo esperado y no
 * contiene path traversal. Se usa antes de firmar/borrar objetos.
 */
export function isSafeStoragePath(path: string, prefix: string): boolean {
  if (!path || path.includes("..") || path.startsWith("/") || path.includes("\\")) {
    return false;
  }
  return path.startsWith(prefix);
}
