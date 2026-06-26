"use client";

import { useEffect, useState } from "react";
import { weekDayLabel } from "@/lib/i18n";
import { WEEK_DAYS } from "@/lib/schedule/constants";
import type { EmployeeSchedule, LeaveRequest } from "@/lib/schedule/types";

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

type LeaveModalProps = {
  open: boolean;
  employees: EmployeeSchedule[];
  onClose: () => void;
  onSubmit: (leave: Omit<LeaveRequest, "id" | "employee">) => void;
};

function teamLabel(team: string): string {
  if (team === "\u670d\u52a1\u5458") return "Sala";
  if (team === "\u5bff\u53f8") return "Sushi";
  if (team === "\u70ed\u53a8") return "Cocina caliente";
  if (team === "\u6d17\u7897") return "Friegaplatos";
  return team;
}

export function LeaveModal({ open, employees, onClose, onSubmit }: LeaveModalProps) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [day, setDay] = useState<(typeof WEEK_DAYS)[number]>("\u5468\u4e00");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setEmployeeId(employees[0]?.id ?? "");
    setDay("\u5468\u4e00");
    setReason("");
  }, [open, employees]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !reason.trim()) return;
    onSubmit({ employeeId, day, reason: reason.trim(), status: "\u5df2\u6279\u51c6" });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">Registrar ausencia</h2>
        <p className="mt-1 text-sm text-gray-500">Registro mock; se aprueba al momento.</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Empleado</span>
            <select
              className={inputClass}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({teamLabel(emp.team)})
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Día</span>
            <select
              className={inputClass}
              value={day}
              onChange={(e) => setDay(e.target.value as (typeof WEEK_DAYS)[number])}
            >
              {WEEK_DAYS.map((d) => (
                <option key={d} value={d}>
                  {weekDayLabel("es", d)}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">Motivo</span>
            <textarea
              className={inputClass}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Indica el motivo"
              required
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="rounded-lg bg-karuma-600 px-4 py-2 text-sm font-medium text-white hover:bg-karuma-700"
            >
              Enviar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
