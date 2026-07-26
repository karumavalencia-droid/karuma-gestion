import { test } from "node:test";
import assert from "node:assert/strict";

import { resolvePageTitle, rutaPadre } from "../lib/layout/page-title";

/** `t` de mentira: devuelve la clave, que es lo que se quiere comprobar. */
const t = (clave: string) => clave;

test("una ruta con título propio usa el suyo", () => {
  assert.equal(resolvePageTitle("/dashboard", t), "dashboard.title");
});

test("una ruta del menú sin título propio usa el del menú", () => {
  assert.equal(resolvePageTitle("/mensajes", t), "nav.mensajes");
});

test("una subpágina hereda el título del padre en vez de caer a Karuma ERP", () => {
  // Era el fallo: /mensajes/<id> mostraba "Karuma ERP".
  assert.equal(resolvePageTitle("/mensajes/9ba5a6ad-50c0-4", t), "nav.mensajes");
  assert.equal(resolvePageTitle("/mensajes/insights", t), "nav.mensajes");
});

test("el mismo arreglo cubre el resto de páginas de detalle", () => {
  // Si el padre tiene título propio, ese manda sobre la clave del menú.
  assert.equal(resolvePageTitle("/staff/abc-123", t), "staff.title");
  // Si no lo tiene, se usa la del menú.
  assert.equal(resolvePageTitle("/ceo/change-requests/xyz", t), "nav.ceo");
});

test("gana el padre más específico", () => {
  // /dashboard y /dashboard/reservas son ambos prefijos válidos.
  assert.equal(rutaPadre("/dashboard/reservas/algo"), "/dashboard/reservas");
});

test("una ruta desconocida sin padre cae al nombre de la app", () => {
  assert.equal(resolvePageTitle("/inventado", t), "header.appName");
  assert.equal(rutaPadre("/inventado"), null);
});

test("el prefijo exige barra: /mensajitos no es hijo de /mensajes", () => {
  assert.equal(rutaPadre("/mensajitos"), null);
});
