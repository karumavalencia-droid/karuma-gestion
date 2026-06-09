"use client";

import { useEffect, useState } from "react";
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

export function LeaveModal({ open, employees, onClose, onSubmit }: LeaveModalProps) {
  const [employeeId, setEmployeeId] = useState(employees[0]?.id ?? "");
  const [day, setDay] = useState<(typeof WEEK_DAYS)[number]>("周一");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (!open) return;
    setEmployeeId(employees[0]?.id ?? "");
    setDay("周一");
    setReason("");
  }, [open, employees]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId || !reason.trim()) return;
    onSubmit({ employeeId, day, reason: reason.trim(), status: "已批准" });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">请假登记</h2>
        <p className="mt-1 text-sm text-gray-500">Mock 登记，立即生效为已批准</p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">员工</span>
            <select
              className={inputClass}
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name}（{emp.team}）
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">日期</span>
            <select
              className={inputClass}
              value={day}
              onChange={(e) => setDay(e.target.value as (typeof WEEK_DAYS)[number])}
            >
              {WEEK_DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">原因</span>
            <textarea
              className={inputClass}
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请输入请假原因"
              required
            />
          </label>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="rounded-lg bg-karuma-600 px-4 py-2 text-sm font-medium text-white hover:bg-karuma-700"
            >
              提交
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
