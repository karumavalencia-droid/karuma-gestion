/**
 * Detección de dispositivo a partir del User-Agent.
 *
 * Se usa para exigir el código SMS solo cuando el empleado entra desde su
 * móvil. En la tablet del local (kiosco) y en el ordenador de oficina el
 * login sigue siendo solo el PIN, para no frenar el fichaje del turno.
 *
 * OJO: el User-Agent lo manda el navegador y se puede falsificar. Esto es
 * una decisión de comodidad, no una frontera de seguridad.
 */

/** Móviles que no llevan "Mobi" en el User-Agent. */
const PHONE_MARKERS = /iPhone|iPod|Windows Phone|BlackBerry|BB10|Opera Mini|IEMobile/i;

export function isMobileUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  // Las tablets (iPad, Android sin "Mobile") quedan fuera a propósito.
  if (/iPad/i.test(userAgent)) return false;
  if (PHONE_MARKERS.test(userAgent)) return true;
  // Chrome/Firefox en Android añaden "Mobile"/"Mobi"; en tablet no lo hacen.
  return /\bMobi(le)?\b/i.test(userAgent);
}
