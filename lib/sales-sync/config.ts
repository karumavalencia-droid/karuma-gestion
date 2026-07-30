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

// El estado de conexión con el TPV lo decide ahora
// `isRestosuiteConfigured()` en lib/pos/restosuite-client.ts, que es quien
// conoce las variables de entorno que necesita la sincronización.
