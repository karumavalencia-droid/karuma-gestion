/**
 * Título de la cabecera a partir de la ruta.
 *
 * Antes solo se resolvían coincidencias exactas, así que cualquier subpágina
 * (`/mensajes/<id>`, `/staff/<id>`, `/ceo/change-requests/<id>`…) caía al nombre
 * genérico "Karuma ERP" y el usuario perdía la referencia de dónde estaba.
 * Ahora hereda el título de la ruta padre conocida más específica.
 */

import { ROUTE_NAV_KEY, ROUTE_PAGE_TITLE } from "@/lib/i18n/translations";

/** Ruta conocida más larga que sea prefijo de `pathname`. */
export function rutaPadre(pathname: string): string | null {
  const candidatas = [
    ...Object.keys(ROUTE_PAGE_TITLE),
    ...Object.keys(ROUTE_NAV_KEY),
  ].filter((ruta) => pathname.startsWith(`${ruta}/`));

  if (candidatas.length === 0) return null;
  // La más específica gana: /dashboard/reservas antes que /dashboard.
  return candidatas.sort((a, b) => b.length - a.length)[0];
}

export function resolvePageTitle(pathname: string, t: (key: string) => string): string {
  const claveExacta = ROUTE_PAGE_TITLE[pathname];
  if (claveExacta) return t(claveExacta);

  const navExacta = ROUTE_NAV_KEY[pathname];
  if (navExacta) return t(`nav.${navExacta}`);

  const padre = rutaPadre(pathname);
  if (padre) {
    const clavePadre = ROUTE_PAGE_TITLE[padre];
    if (clavePadre) return t(clavePadre);
    const navPadre = ROUTE_NAV_KEY[padre];
    if (navPadre) return t(`nav.${navPadre}`);
  }

  return t("header.appName");
}
