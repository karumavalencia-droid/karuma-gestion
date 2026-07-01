import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  createTableBlock,
  createReserva,
  editReserva,
  loadReservas,
  type ServicioLocal,
} from "../lib/reservas/local-store";

class MemoryStorage implements Storage {
  private data = new Map<string, string>();

  get length() {
    return this.data.size;
  }

  clear() {
    this.data.clear();
  }

  getItem(key: string) {
    return this.data.get(key) ?? null;
  }

  key(index: number) {
    return Array.from(this.data.keys())[index] ?? null;
  }

  removeItem(key: string) {
    this.data.delete(key);
  }

  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

function setupBrowserStorage() {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: storage,
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: globalThis,
  });
}

function futureDate(daysFromNow = 1): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split("T")[0];
}

function reservaInput(
  overrides: Partial<Parameters<typeof createReserva>[0]> = {},
): Parameters<typeof createReserva>[0] {
  return {
    fecha: futureDate(),
    hora: "13:30",
    servicio: "comida" as ServicioLocal,
    personas: 2,
    nombre: "Cliente",
    telefono: "600000000",
    notas: "",
    origen: "manual",
    forceMesaIds: ["T1"],
    ...overrides,
  };
}

beforeEach(() => {
  setupBrowserStorage();
});

test("manual table assignment blocks another reservation inside the 90-minute table window", () => {
  const fecha = futureDate();
  const first = createReserva(reservaInput({ fecha, hora: "13:30", forceMesaIds: ["T1"] }));
  assert.equal(first.ok, true);

  const conflict = createReserva(reservaInput({ fecha, hora: "14:30", forceMesaIds: ["T1"] }));
  assert.equal(conflict.ok, false);
  if (!conflict.ok) assert.match(conflict.error, /1h30/);

  const allowed = createReserva(reservaInput({ fecha, hora: "15:00", forceMesaIds: ["T1"] }));
  assert.equal(allowed.ok, true);
});

test("larger parties keep the table blocked for their configured duration", () => {
  const fecha = futureDate();
  const first = createReserva(reservaInput({ fecha, hora: "13:30", personas: 4, forceMesaIds: ["T7"] }));
  assert.equal(first.ok, true);

  const conflict = createReserva(reservaInput({ fecha, hora: "15:00", personas: 4, forceMesaIds: ["T7"] }));
  assert.equal(conflict.ok, false);

  const allowed = createReserva(reservaInput({ fecha, hora: "15:30", personas: 4, forceMesaIds: ["T7"] }));
  assert.equal(allowed.ok, true);
});

test("editing a reservation cannot move it into another turn on the same table", () => {
  const fecha = futureDate();
  const first = createReserva(reservaInput({ fecha, hora: "13:30", forceMesaIds: ["T1"] }));
  const second = createReserva(reservaInput({ fecha, hora: "15:00", forceMesaIds: ["T1"] }));
  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  if (!second.ok) return;

  const edit = editReserva(second.reserva.id, { hora: "14:30" });
  assert.equal(edit.ok, false);

  const stored = loadReservas().find((r) => r.id === second.reserva.id);
  assert.equal(stored?.hora, "15:00");
});

test("table blocks reserve the selected table for their configured duration", () => {
  const fecha = futureDate();
  const block = createTableBlock({
    fecha,
    hora: "13:00",
    servicio: "comida",
    duracionMin: 60,
    mesaIds: ["T2"],
    notas: "Mantenimiento",
  });
  assert.equal(block.ok, true);

  const conflict = createReserva(reservaInput({ fecha, hora: "13:30", forceMesaIds: ["T2"] }));
  assert.equal(conflict.ok, false);
  if (!conflict.ok) assert.match(conflict.error, /1h30|disponible/);

  const allowed = createReserva(reservaInput({ fecha, hora: "14:00", forceMesaIds: ["T2"] }));
  assert.equal(allowed.ok, true);
});
