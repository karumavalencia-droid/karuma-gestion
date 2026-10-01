import { ocupadasEn, type ServicioLocal } from "./local-store";

export function isMesaLabel(text: string): boolean {
  return text.trim().toLocaleLowerCase("es").startsWith("mesa");
}

// One synchronization per date during this modal's lifetime. Every render attaches
// its own callback to the shared promise, so changing time/personas on the same
// date still receives the result, while obsolete callbacks are cancelled.
export function createAvailabilitySync(sync: (fecha: string) => Promise<unknown>) {
  const dates = new Map<string, Promise<unknown>>();
  return {
    refresh(fecha: string, apply: () => void): () => void {
      let active = true;
      apply();
      let pending = dates.get(fecha);
      if (!pending) {
        pending = Promise.resolve().then(() => sync(fecha));
        dates.set(fecha, pending);
        void pending.catch(() => { dates.delete(fecha); });
      }
      const refresh = () => { if (active) apply(); };
      void pending.then(refresh, refresh);
      return () => { active = false; };
    },
  };
}

export function applyMesaAvailability(
  modal: HTMLElement,
  fecha: string,
  hora: string,
  servicio: ServicioLocal,
  personas: number,
) {
  const labels = Array.from(modal.querySelectorAll("label"));
  const mesaLabel = labels.find((label) => isMesaLabel(label.textContent ?? ""));
  const mesaField = mesaLabel?.parentElement;
  if (!(mesaField instanceof HTMLElement) || !fecha || !hora) return;

  const ocupadas = ocupadasEn(fecha, hora, servicio, personas);
  const buttons = Array.from(mesaField.querySelectorAll("button"));

  for (const button of buttons) {
    if (!(button instanceof HTMLButtonElement)) continue;
    const numberText = button.querySelector("p")?.textContent?.trim();
    if (!numberText || !/^T\d+$/.test(numberText)) continue;

    const occupied = ocupadas.has(numberText);
    if (occupied) {
      if (button.classList.contains("border-karuma-600") && !button.disabled) button.click();
      button.disabled = true;
      button.setAttribute("aria-disabled", "true");
      button.title = "Mesa ocupada durante este turno";
      button.classList.add("nr-occupied");
    } else {
      button.disabled = false;
      button.removeAttribute("aria-disabled");
      if (button.title === "Mesa ocupada durante este turno") button.removeAttribute("title");
      button.classList.remove("nr-occupied");
    }
  }
}

