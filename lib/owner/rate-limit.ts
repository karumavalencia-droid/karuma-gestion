// ─── Rate limit básico en memoria para la zona privada ────────────────────────
// Ventana deslizante simple por clave (userId). No sustituye a un limitador
// distribuido, pero frena abusos evidentes desde una misma sesión. La fuerza
// bruta de contraseña/MFA la controla además Supabase Auth en su lado.

const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 100;

interface Bucket {
  count: number;
  resetAt: number;
}

const globalStore = globalThis as typeof globalThis & {
  __ownerRate?: Map<string, Bucket>;
};

function store(): Map<string, Bucket> {
  if (!globalStore.__ownerRate) globalStore.__ownerRate = new Map();
  return globalStore.__ownerRate;
}

/** Devuelve true si la petición está dentro del límite; false si se excede. */
export function allowOwnerRequest(key: string, now = Date.now()): boolean {
  const map = store();
  const bucket = map.get(key);
  if (!bucket || now >= bucket.resetAt) {
    map.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= MAX_PER_WINDOW;
}
