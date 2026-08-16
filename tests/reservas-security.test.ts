import test from "node:test";
import assert from "node:assert/strict";

import {
  canManageReservations,
  isPublicReservationApiRequest,
  isReservationOrigin,
  reservationCreationNeedsStaff,
} from "../lib/reservas/security";

test("solo las operaciones necesarias para la web de reservas son públicas", () => {
  assert.equal(isPublicReservationApiRequest("/api/reservas/config", "GET"), true);
  assert.equal(isPublicReservationApiRequest("/api/reservas/disponibilidad", "GET"), true);
  assert.equal(isPublicReservationApiRequest("/api/reservas/crear", "POST"), true);
  assert.equal(isPublicReservationApiRequest("/api/reservas/lista-espera", "POST"), true);

  assert.equal(isPublicReservationApiRequest("/api/reservas/actualizar", "POST"), false);
  assert.equal(isPublicReservationApiRequest("/api/reservas/actualizar-estado", "POST"), false);
  assert.equal(isPublicReservationApiRequest("/api/reservas/reenviar-confirmacion", "POST"), false);
  assert.equal(isPublicReservationApiRequest("/api/reservas/horario-semanal", "GET"), false);
  assert.equal(isPublicReservationApiRequest("/api/reservas/lista-espera", "GET"), false);
});

test("una creación manual, walk-in o con mesa forzada exige sesión", () => {
  assert.equal(reservationCreationNeedsStaff({ origen: "online" }), false);
  assert.equal(reservationCreationNeedsStaff({}), false);
  assert.equal(reservationCreationNeedsStaff({ origen: "manual" }), true);
  assert.equal(reservationCreationNeedsStaff({ origen: "walkin" }), true);
  assert.equal(reservationCreationNeedsStaff({ origen: "telefono" }), true);
  assert.equal(reservationCreationNeedsStaff({ origen: "online", bloqueo: true }), true);
  assert.equal(reservationCreationNeedsStaff({ origen: "online", forceMesaIds: [] }), true);
  assert.equal(reservationCreationNeedsStaff({ origen: "online", duracionMin: 90 }), true);
});

test("solo se aceptan orígenes de reserva conocidos", () => {
  for (const origin of ["online", "telefono", "walkin", "manual"]) {
    assert.equal(isReservationOrigin(origin), true);
  }
  assert.equal(isReservationOrigin("staff"), false);
  assert.equal(isReservationOrigin("otro"), false);
  assert.equal(isReservationOrigin(null), false);
});

test("solo cuentas de gestión sin employeeId pueden administrar reservas", () => {
  assert.equal(canManageReservations(null), false);
  assert.equal(canManageReservations({
    name: "Empleado",
    email: "empleado@example.com",
    role: "waiter",
    employeeId: "empleado-1",
  }), false);
  assert.equal(canManageReservations({
    name: "Oficina",
    email: "oficina@example.com",
    role: "manager",
    employeeId: null,
  }), true);
});
