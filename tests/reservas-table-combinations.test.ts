import assert from "node:assert/strict";
import test from "node:test";
import { asignarMesa } from "../lib/reservas/disponibilidad";
import type { Mesa, Reserva, ReservasConfig } from "../lib/reservas/types";

const config: ReservasConfig = {
  reservas_online_activas: true,
  max_personas_online: 6,
  intervalo_min: 15,
  turno_gap_min: 0,
  duracion_1_2_min: 90,
  duracion_3_4_min: 120,
  duracion_5_6_min: 150,
  dias_max_antelacion: 7,
  capacidad_online_pct: 100,
  comida_inicio: "13:00",
  comida_fin: "15:00",
  cena_inicio: "20:00",
  cena_fin: "22:00",
  telefono: null,
  whatsapp: null,
  google_review_link: null,
};

function mesa(id: number, capacidad: number, adyacentes: number[]): Mesa {
  return {
    id,
    numero: id,
    capacidad,
    zona: "Interior",
    combinable: true,
    activa: true,
    pos_x: null,
    pos_y: null,
    adjacent_mesa_ids: adyacentes,
  };
}

function reserva(mesaIds: number[], hora = "14:00", duracion = 60): Reserva {
  return {
    id: `reserva-${mesaIds.join("-")}`,
    cliente_id: null,
    fecha: "2026-08-01",
    hora_inicio: hora,
    duracion_min: duracion,
    servicio: "comida",
    personas: 2,
    mesa_ids: mesaIds,
    estado: "Confirmada",
    notas: null,
    origen: "telefono",
    review_email_sent_at: null,
    created_at: "2026-07-20T00:00:00Z",
  };
}

test("6 guests can use a connected row of three free two-person tables", () => {
  const mesas = [
    mesa(1, 2, [2]),
    mesa(2, 2, [1, 3]),
    mesa(3, 2, [2]),
  ];
  assert.deepEqual(asignarMesa(mesas, [], "2026-08-01", "13:00", 150, 6, config), [1, 2, 3]);
});

test("6 guests prefer an adjacent four-person plus two-person table pair", () => {
  const mesas = [mesa(1, 4, [2]), mesa(2, 2, [1])];
  assert.deepEqual(asignarMesa(mesas, [], "2026-08-01", "13:00", 150, 6, config), [1, 2]);
});

test("four scattered two-person tables cannot be combined", () => {
  const mesas = [mesa(1, 2, []), mesa(2, 2, []), mesa(3, 2, []), mesa(4, 2, [])];
  assert.equal(asignarMesa(mesas, [], "2026-08-01", "13:00", 150, 6, config), null);
});

test("a conflict anywhere in the requested interval rejects the whole combination", () => {
  const mesas = [
    mesa(1, 2, [2]),
    mesa(2, 2, [1, 3]),
    mesa(3, 2, [2]),
  ];
  const conflicto = reserva([2], "14:30", 60);
  assert.equal(
    asignarMesa(mesas, [conflicto], "2026-08-01", "13:00", 150, 6, config),
    null,
  );
});
