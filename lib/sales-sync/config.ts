/**
 * Identificador interno por defecto de la ubicación (Karuma Sushi).
 * Se mantiene "karuma-valencia" por compatibilidad con los datos previos
 * (blob JSON y normalize.ts). Configurable con SALES_DEFAULT_LOCATION_ID.
 */
export const FALLBACK_LOCATION_ID = "karuma-valencia";

export function getDefaultLocationId(): string {
  return process.env.SALES_DEFAULT_LOCATION_ID?.trim() || FALLBACK_LOCATION_ID;
}

/** Límite de tamaño para ficheros CSV subidos (2 MB). */
export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;

/**
 * ¿La URL configurada del TPV es un placeholder (no una API real)?
 * Mientras Restosuite/Palmier Pro no entregue credenciales oficiales, el cron
 * y el estado de conexión deben tratar estos valores como "no configurado" y
 * NO hacer ninguna petición externa.
 */
export function isPlaceholderApiUrl(url: string | undefined): boolean {
  if (!url) return true;
  return /pos-provider\.example|your-pos|example\.(com|org|net)|placeholder/i.test(url);
}

/** ¿Hay una API real del TPV configurada? (URL no-placeholder + token) */
export function isPosApiConfigured(): boolean {
  return (
    !isPlaceholderApiUrl(process.env.RESTOSUITE_API_URL) &&
    Boolean(process.env.RESTOSUITE_API_TOKEN)
  );
}
