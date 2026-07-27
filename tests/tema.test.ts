import { test } from "node:test";
import assert from "node:assert/strict";

import { esRutaPublica, GUION_TEMA } from "../lib/theme/ThemeProvider";

test("las páginas de cliente quedan fuera del tema del ERP", () => {
  // /reservas tiene su propia paleta: con el oscuro del ERP las tarjetas de
  // comensales quedaban con texto oscuro sobre fondo oscuro.
  assert.equal(esRutaPublica("/reservas"), true);
  assert.equal(esRutaPublica("/reservas/gestionar/abc123"), true);
  assert.equal(esRutaPublica("/kiosk"), true);
});

test("las páginas del ERP sí llevan tema", () => {
  assert.equal(esRutaPublica("/dashboard"), false);
  assert.equal(esRutaPublica("/mensajes"), false);
  assert.equal(esRutaPublica("/login"), false);
});

test("el prefijo exige barra: /reservas-antiguas no es pública", () => {
  assert.equal(esRutaPublica("/reservas-antiguas"), false);
  assert.equal(esRutaPublica("/kioskos"), false);
});

test("el guion anti-parpadeo es JavaScript válido y no revienta sin localStorage", () => {
  // Se ejecuta antes de hidratar: si lanza, la página se queda en blanco.
  const fn = new Function("location", "localStorage", "window", "document", GUION_TEMA);

  const doc = {
    documentElement: {
      classList: {
        valor: null as boolean | null,
        toggle(_c: string, v: boolean) {
          this.valor = v;
        },
      },
    },
  };
  const win = { matchMedia: () => ({ matches: true }) };

  // Caso normal: preferencia oscura en una página del ERP.
  fn({ pathname: "/dashboard" }, { getItem: () => "oscuro" }, win, doc);
  assert.equal(doc.documentElement.classList.valor, true);

  // Página pública: nunca oscuro, aunque el sistema lo pida.
  fn({ pathname: "/reservas" }, { getItem: () => "oscuro" }, win, doc);
  assert.equal(doc.documentElement.classList.valor, false);

  // Sin preferencia guardada: CLARO, aunque el sistema pida oscuro. El tema
  // oscuro se enciende a mano; no debe aparecer solo en el móvil de nadie.
  fn({ pathname: "/dashboard" }, { getItem: () => null }, win, doc);
  assert.equal(doc.documentElement.classList.valor, false);

  // Quien elija explícitamente "sistema" sí sigue al sistema operativo.
  fn({ pathname: "/dashboard" }, { getItem: () => "sistema" }, win, doc);
  assert.equal(doc.documentElement.classList.valor, true);

  // Y si localStorage lanza (modo privado), no debe propagar el error.
  assert.doesNotThrow(() =>
    fn(
      { pathname: "/dashboard" },
      {
        getItem() {
          throw new Error("bloqueado");
        },
      },
      win,
      doc,
    ),
  );
});
