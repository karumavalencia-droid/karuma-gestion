"use client";

import { useEffect, useRef } from "react";
import type { ServicioLocal } from "@/lib/reservas/local-store";
import { ocupadasEn, slotsPlano } from "@/lib/reservas/local-store";
import { APERTURA } from "@/lib/reservas/horario-publico";
import { syncAndLoadReservas } from "@/lib/reservas/sync";

type TimeSlotPickerProps = {
  value: string;
  onChange: (hora: string) => void;
  servicio: ServicioLocal;
  className?: string;
  compact?: boolean;
};

function findModalContent(node: HTMLElement | null): HTMLElement | null {
  let current = node?.parentElement ?? null;
  while (current) {
    if (current.parentElement?.classList.contains("fixed")) return current;
    current = current.parentElement;
  }
  return null;
}

function prepareNuevaReservaLayout(root: HTMLElement): {
  modal: HTMLElement;
  form: HTMLElement;
} | null {
  const modal = findModalContent(root);
  if (!modal || modal.querySelector("h2")?.textContent?.trim() !== "Nueva Reserva") return null;

  const form = root.parentElement?.parentElement;
  if (!(form instanceof HTMLElement)) return null;

  modal.classList.add("nr-modal");
  form.classList.add("nr-form");
  root.classList.add("nr-time-picker");

  for (const label of Array.from(form.querySelectorAll("label"))) {
    const field = label.parentElement;
    if (!(field instanceof HTMLElement)) continue;
    const text = label.textContent?.trim() ?? "";
    if (text.startsWith("Fecha")) field.classList.add("nr-field-fecha");
    if (text.startsWith("Hora")) field.classList.add("nr-field-hora");
    if (text.startsWith("Notas")) field.classList.add("nr-field-notas");
    if (text.startsWith("Mesa manual")) field.classList.add("nr-field-mesa");
  }

  return { modal, form };
}

function applyMesaAvailability(
  modal: HTMLElement,
  fecha: string,
  hora: string,
  servicio: ServicioLocal,
  personas: number,
) {
  const labels = Array.from(modal.querySelectorAll("label"));
  const mesaLabel = labels.find((label) => label.textContent?.trim().startsWith("Mesa manual"));
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

export function TimeSlotPicker({
  value,
  onChange,
  servicio,
  className = "",
  compact = false,
}: TimeSlotPickerProps) {
  const ultimoPase = APERTURA[servicio].ultimoPase;
  const slots = slotsPlano(servicio).filter((slot) => slot <= ultimoPase);
  const selected = value.slice(0, 5);
  const isSelectedInSlot = !selected || slots.includes(selected);
  const rootRef = useRef<HTMLDivElement>(null);
  const lastSyncedDateRef = useRef("");

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const prepared = prepareNuevaReservaLayout(root);
    if (!prepared) return;

    const dateInput = prepared.modal.querySelector('input[type="date"]');
    const peopleInput = prepared.modal.querySelector('input[type="number"]');
    const fecha = dateInput instanceof HTMLInputElement ? dateInput.value : "";
    const personas = peopleInput instanceof HTMLInputElement
      ? Math.max(1, Number(peopleInput.value) || 1)
      : 1;

    const refreshTables = () => {
      applyMesaAvailability(prepared.modal, fecha, selected, servicio, personas);
    };

    refreshTables();

    if (fecha && lastSyncedDateRef.current !== fecha) {
      lastSyncedDateRef.current = fecha;
      void syncAndLoadReservas(fecha)
        .then(refreshTables)
        .catch(refreshTables);
    }
  });

  return (
    <div ref={rootRef} className={className}>
      <style jsx global>{`
        .nr-occupied {
          border-color: rgb(252 211 77) !important;
          background: rgb(254 243 199) !important;
          color: rgb(146 64 14) !important;
          cursor: not-allowed !important;
          opacity: 1 !important;
        }
        .nr-occupied p:last-child { display: none; }
        .nr-occupied::after {
          content: "Ocupada";
          display: block;
          margin-top: 1px;
          font-size: 9px;
          line-height: 12px;
          font-weight: 800;
          color: rgb(180 83 9);
        }

        @media (min-width: 768px) {
          .nr-modal {
            width: min(1040px, calc(100vw - 32px)) !important;
            max-width: 1040px !important;
            max-height: calc(100vh - 24px) !important;
            overflow: hidden !important;
            padding: 16px 20px !important;
          }
          .nr-modal > div:first-child { margin-bottom: 8px !important; }
          .nr-form {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            column-gap: 14px !important;
            row-gap: 8px !important;
          }
          .nr-form > :not([hidden]) ~ :not([hidden]) { margin-top: 0 !important; }

          /* Fecha y Hora siempre van primero y nunca pueden quedar ocultas por
             el layout compacto del iPad/escritorio. */
          .nr-field-fecha {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            order: -2 !important;
            grid-column: 1 !important;
            min-width: 0 !important;
          }
          .nr-field-hora {
            display: block !important;
            visibility: visible !important;
            opacity: 1 !important;
            order: -1 !important;
            grid-column: 2 !important;
            min-width: 0 !important;
          }
          .nr-field-fecha input[type="date"] {
            display: block !important;
            width: 100% !important;
            min-height: 36px !important;
          }

          .nr-form > .border-red-200,
          .nr-field-mesa,
          .nr-form > button:last-child {
            grid-column: 1 / -1;
          }
          .nr-form input,
          .nr-form select,
          .nr-form textarea {
            padding-top: 7px !important;
            padding-bottom: 7px !important;
          }
          .nr-form textarea {
            min-height: 48px !important;
            max-height: 52px !important;
          }
          .nr-time-picker > div:first-child {
            gap: 5px !important;
          }
          .nr-time-picker button {
            padding-top: 6px !important;
            padding-bottom: 6px !important;
          }
          .nr-field-mesa > div:last-child {
            gap: 5px !important;
          }
          .nr-field-mesa button {
            padding-top: 4px !important;
            padding-bottom: 4px !important;
          }
          .nr-form > button:last-child {
            padding-top: 9px !important;
            padding-bottom: 9px !important;
          }
        }
      `}</style>
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-5">
        {slots.map((slot) => {
          const active = selected === slot;
          return (
            <button
              key={slot}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(slot)}
              className={`rounded-lg border text-center font-black transition-colors ${
                compact ? "px-2 py-2 text-xs" : "px-3 py-2.5 text-sm"
              } ${
                active
                  ? "border-karuma-600 bg-karuma-600 text-white shadow-sm"
                  : "border-gray-200 bg-white text-gray-700 hover:border-karuma-500 hover:bg-karuma-50 hover:text-karuma-700"
              }`}
            >
              {slot}
            </button>
          );
        })}
      </div>
      {!isSelectedInSlot && (
        <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
          Hora actual: {selected}. Elige una franja de 15 min.
        </p>
      )}
    </div>
  );
}
