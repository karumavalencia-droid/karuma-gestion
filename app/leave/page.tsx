"use client";

import { useState } from "react";
import {
  LEAVE_REQUESTS as INITIAL_LEAVES,
  formatLeaveDate,
  type LeaveRequest,
  type LeaveStatus,
} from "@/lib/scheduling-v1/mock";

const STATUS_STYLE: Record<LeaveStatus, string> = {
  待审批: "bg-amber-50 text-amber-700 ring-amber-600/20",
  已批准: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  已拒绝: "bg-gray-50 text-gray-600 ring-gray-500/20",
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
      <p className="text-sm text-gray-500">请假管理 · 本地 mock 数据</p>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">员工</th>
                <th className="px-4 py-3">日期</th>
                <th className="px-4 py-3">星期</th>
                <th className="px-4 py-3">原因</th>
                <th className="px-4 py-3">状态</th>
                <th className="px-4 py-3">操作</th>
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
                      {leave.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    {leave.status === "待审批" ? (
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => updateStatus(leave.id, "已批准")}
                          className="text-sm font-medium text-karuma-600 hover:text-karuma-700"
                        >
                          批准
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(leave.id, "已拒绝")}
                          className="text-sm font-medium text-gray-500 hover:text-gray-700"
                        >
                          拒绝
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
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-400">班次说明</p>
        <p className="text-sm text-gray-600">
          <span className="inline-flex rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 ring-1 ring-inset ring-red-600/20">
            请假
          </span>
          <span className="ml-2">已批准的请假将同步到排班表，工时为 0h</span>
        </p>
      </div>
    </div>
  );
}
