"use client";

import { useState } from "react";
import {
  LEAVE_REQUESTS as INITIAL_LEAVES,
  formatLeaveDate,
  type LeaveRequest,
  type LeaveStatus,
} from "@/lib/scheduling-v1/mock";

const STATUS_STYLE: Record<LeaveStatus, string> = {
  Pendiente: "bg-amber-50 text-amber-700 ring-amber-600/20",
  Aprobada: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  Rechazada: "bg-gray-50 text-gray-600 ring-gray-500/20",
};

const STATUS_LABEL: Record<LeaveStatus, string> = {
  Pendiente: "Pendiente",
  Aprobada: "Aprobada",
  Rechazada: "Rechazada",
};

export default function LeavePage() {
  const [leaves, setLeaves] = useState<LeaveRequest[]>(() =>
    INITIAL_LEAVES.map((l) => ({ ...l })),
  );

  const updateStatus = (id: string, status: LeaveStatus) => {
    setLeaves((prev) => prev.map((l) => (l.id === id ? { ...l, status } : l)));
  };

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500">Gestión de ausencias · datos mock locales</p>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Empleado</th>
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Día</th>
                <th className="px-4 py-3">Motivo</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {leaves.map((leave) => (
                <tr key={leave.id} className="hover:bg-gray-50/80">
                  <td className="px-4 py-3.5 font-medium text-gray-900">{leave.employee}</td>
                  <td className="px-4 py-3.5 text-gray-600">{formatLeaveDate(leave.date)}</td>
                  <td className="px-4 py-3.5 text-gray-600">{leave.day}</td>
                  <td className="px-4 py-3.5 text-gray-600">{leave.reason}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${STATUS_STYLE[leave.status]}`}
                    >
                      {STATUS_LABEL[leave.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {leave.status === "Pendiente" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateStatus(leave.id, "Aprobada")}
                          className="text-sm font-medium text-karuma-600 hover:text-karuma-700"
                        >
                          Aprobar
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(leave.id, "Rechazada")}
                          className="text-sm font-medium text-gray-500 hover:text-gray-700"
                        >
                          Rechazar
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">Nota de horarios</p>
        <p className="text-sm text-gray-600">
          <span className="inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
            Ausencia
          </span>
          <span className="ml-2">Las ausencias aprobadas se sincronizan con el horario y cuentan como 0h.</span>
        </p>
      </div>
    </div>
  );
}
