import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { readFileSync } from "node:fs";
import { applyMesaAvailability, createAvailabilitySync } from "../lib/reservas/modal-availability";
import { saveReservas, type ReservaLocal } from "../lib/reservas/local-store";

class Element {
  textContent = "";
  parentElement: Element | null = null;
  children: Element[] = [];
  classes = new Set<string>();
  classList = {
    contains: (s: string) => this.classes.has(s),
    add: (s: string) => { this.classes.add(s); },
    remove: (s: string) => { this.classes.delete(s); },
  };
  querySelectorAll(selector: string) { return this.children.filter(e => selector === "button" ? e instanceof Button : !(e instanceof Button)); }
}
class Button extends Element {
  disabled = false;
  title = "";
  clicks = 0;
  attrs = new Map<string, string>();
  constructor(readonly number: string) { super(); }
  querySelector() { return { textContent: this.number }; }
  setAttribute(k: string, v: string) { this.attrs.set(k, v); }
  removeAttribute(k: string) { this.attrs.delete(k); }
  click() { if (!this.disabled) { this.clicks++; this.classes.delete("border-karuma-600"); } }
}
function modal(label: string) {
  const root = new Element(), field = new Element(), mesaLabel = new Element();
  const button = new Button("T1");
  mesaLabel.textContent = label; mesaLabel.parentElement = field;
  root.children = [mesaLabel]; field.children = [button];
  return { root: root as unknown as HTMLElement, button };
}
function reservation(overrides: Partial<ReservaLocal> = {}): ReservaLocal {
  return { id: "r1", type: "reservation", fecha: "2026-10-03", hora: "14:45", servicio: "comida", personas: 2,
    duracionMin: 90, mesaIds: ["T1"], nombre: "Test", telefono: "", notas: "",
    estado: "confirmada", creadoEn: "2026-10-01T00:00:00Z", ...overrides };
}
beforeEach(() => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "window", { configurable: true, value: globalThis });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: {
    getItem: (k: string) => values.get(k) ?? null,
    setItem: (k: string, v: string) => values.set(k, v),
  } });
  Object.defineProperty(globalThis, "HTMLElement", { configurable: true, value: Element });
  Object.defineProperty(globalThis, "HTMLButtonElement", { configurable: true, value: Button });
});
for (const label of ["Mesa (opcional — auto si vacío)", "Mesa manual (opcional — auto si vacío)"]) {
  test(`${label}: blocks and deselects using explicit date/personas without inputs`, () => {
    saveReservas([reservation()]);
    const { root, button } = modal(label);
    applyMesaAvailability(root, "2026-10-03", "13:00", "comida", 2);
    assert.equal(button.disabled, false); // 90 min ends before 14:45
    button.classes.add("border-karuma-600");
    applyMesaAvailability(root, "2026-10-03", "13:00", "comida", 4);
    assert.equal(button.disabled, true); // 120 min overlaps
    assert.equal(button.attrs.get("aria-disabled"), "true");
    assert.equal(button.classes.has("nr-occupied"), true);
    assert.equal(button.clicks, 1);
    applyMesaAvailability(root, "2026-10-04", "13:00", "comida", 4);
    assert.equal(button.disabled, false);
    assert.equal(button.attrs.has("aria-disabled"), false);
    assert.equal(button.classes.has("nr-occupied"), false);
  });
}
function deferred() {
  let resolve!: () => void, reject!: () => void;
  const promise = new Promise<void>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const flush = () => new Promise<void>(resolve => setImmediate(resolve));
for (const change of ["time", "service", "party size"]) {
  test(`pending same-date sync applies latest ${change} and ignores old callback`, async () => {
    const request = deferred(); let calls = 0;
    const sync = createAvailabilitySync(async () => { calls++; await request.promise; });
    const results: string[] = [];
    const cancel = sync.refresh("2026-10-03", () => results.push("old"));
    cancel();
    sync.refresh("2026-10-03", () => results.push(change));
    results.length = 0;
    request.resolve(); await flush();
    assert.deepEqual(results, [change]);
    assert.equal(calls, 1);
  });
}
test("out-of-order date completions cannot disable or deselect a newer table", async () => {
  const old = deferred(), current = deferred();
  const sync = createAvailabilitySync(date => date === "2026-10-03" ? old.promise : current.promise);
  const { root, button } = modal("Mesa (opcional — auto si vacío)");
  const cancel = sync.refresh("2026-10-03", () => applyMesaAvailability(root, "2026-10-03", "13:00", "comida", 4));
  cancel();
  sync.refresh("2026-10-04", () => applyMesaAvailability(root, "2026-10-04", "13:00", "comida", 4));
  button.classes.add("border-karuma-600");
  current.resolve(); await flush();
  saveReservas([reservation()]); // old sync populates the previous date's cache
  old.resolve(); await flush();
  assert.equal(button.disabled, false);
  assert.equal(button.clicks, 0);
  assert.equal(button.classes.has("border-karuma-600"), true);
});
test("closing/unmounting cancels completions, including rejection; failures can retry", async () => {
  const failed = deferred(); let calls = 0, applied = 0;
  const sync = createAvailabilitySync(() => { calls++; return calls === 1 ? failed.promise : Promise.resolve(); });
  const cancel = sync.refresh("2026-10-03", () => applied++);
  cancel(); failed.reject(); await flush();
  assert.equal(applied, 1);
  sync.refresh("2026-10-03", () => applied++); await flush();
  assert.equal(calls, 2);
  assert.equal(applied, 3);
});
test("both Nueva Reserva routes pass their authoritative date and party size", () => {
  for (const [path, date] of [["mesa-view", "fecha"], ["reservas", "nFecha"]]) {
    const source = readFileSync(new URL(`../app/dashboard/${path}/page.tsx`, import.meta.url), "utf8");
    assert.match(source, new RegExp(`<TimeSlotPicker value=\\{nHora\\}[^>]+availability=\\{\\{ fecha: ${date}, personas: nPersonas \\}\\}`));
  }
});
