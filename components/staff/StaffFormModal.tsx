"use client";

import { useEffect, useState } from "react";
import { ROLE_LABELS, type Role } from "@/lib/auth/permissions";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { REST_DAY_KEYS, REST_DAY_LABEL, type RestDayKey } from "@/lib/staff/rest-days";
import { STANDARD_SHIFT_OPTIONS } from "@/lib/staff/shifts";
import type { StaffDepartment, StaffInput, StaffMember } from "@/lib/staff/types";
import { STAFF_DEPARTMENTS } from "@/lib/staff/types";

const ROLES = Object.keys(ROLE_LABELS) as Role[];

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

const emptyForm = (): StaffInput => ({
  name: "",
  department: "Sala",
  position: "",
  role: "waiter",
  phone: "",
  email: "",
  hireDate: "",
  contractType: "全职",
  weeklyHours: 40,
  hourlyRate: 0,
  status: "在职",
  fixedRestDay1: null,
  fixedRestDay2: null,
  fixedShift: null,
});

type StaffFormModalProps = {
  open: boolean;
  mode: "create" | "edit";
  initial?: StaffMember | null;
  saving: boolean;
  onClose: () => void;
  onSave: (input: StaffInput) => void;
};

export function StaffFormModal({
  open,
  mode,
  initial,
  saving,
  onClose,
  onSave,
}: StaffFormModalProps) {
  const { t } = useLanguage();
  const [form, setForm] = useState<StaffInput>(emptyForm);
  const [contractHoursPending, setContractHoursPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setForm({
        name: initial.name,
        department: initial.department,
        position: initial.position,
        role: initial.role,
        phone: initial.phone,
        email: initial.email,
        hireDate: initial.hireDate,
        contractType: initial.contractType,
        weeklyHours: initial.weeklyHours,
        hourlyRate: initial.hourlyRate,
        status: initial.status,
        fixedRestDay1: initial.fixedRestDay1,
        fixedRestDay2: initial.fixedRestDay2,
        fixedShift: initial.fixedShift,
      });
      setContractHoursPending(initial.weeklyHours == null);
    } else {
      setForm(emptyForm());
      setContractHoursPending(false);
    }
  }, [open, initial]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      weeklyHours: contractHoursPending ? null : form.weeklyHours,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">
          {mode === "create" ? t("staff.formCreate") : t("staff.formEdit")}
        </h2>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">姓名 *</span>
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">部门 *</span>
              <select
                className={inputClass}
                value={form.department}
                onChange={(e) =>
                  setForm((f) => ({ ...f, department: e.target.value as StaffDepartment }))
                }
              >
                {STAFF_DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">岗位 *</span>
              <input
                className={inputClass}
                value={form.position}
                onChange={(e) => setForm((f) => ({ ...f, position: e.target.value }))}
                required
              />
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">角色 *</span>
            <select
              className={inputClass}
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            >
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">电话</span>
              <input
                className={inputClass}
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">邮箱</span>
              <input
                type="email"
                className={inputClass}
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">入职日期</span>
              <input
                type="date"
                className={inputClass}
                value={form.hireDate}
                onChange={(e) => setForm((f) => ({ ...f, hireDate: e.target.value }))}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">合同类型</span>
              <select
                className={inputClass}
                value={form.contractType}
                onChange={(e) => setForm((f) => ({ ...f, contractType: e.target.value }))}
              >
                <option value="全职">全职</option>
                <option value="兼职">兼职</option>
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">固定休息日 1</span>
              <select
                className={inputClass}
                value={form.fixedRestDay1 ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    fixedRestDay1: (e.target.value || null) as RestDayKey | null,
                  }))
                }
              >
                <option value="">无</option>
                {REST_DAY_KEYS.map((day) => (
                  <option key={day} value={day}>
                    {REST_DAY_LABEL[day]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">固定休息日 2</span>
              <select
                className={inputClass}
                value={form.fixedRestDay2 ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    fixedRestDay2: (e.target.value || null) as RestDayKey | null,
                  }))
                }
              >
                <option value="">无</option>
                {REST_DAY_KEYS.map((day) => (
                  <option key={day} value={day}>
                    {REST_DAY_LABEL[day]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-medium text-gray-700">标准班次</span>
            <select
              className={inputClass}
              value={form.fixedShift ?? ""}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  fixedShift: (e.target.value || null) as StaffInput["fixedShift"],
                }))
              }
            >
              <option value="">待确认</option>
              {STANDARD_SHIFT_OPTIONS.map((shift) => (
                <option key={shift} value={shift}>
                  {shift}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="col-span-2 block space-y-1">
              <span className="text-sm font-medium text-gray-700">合同工时</span>
              <input
                type="number"
                min={0}
                className={inputClass}
                value={contractHoursPending ? "" : (form.weeklyHours ?? "")}
                disabled={contractHoursPending}
                placeholder={contractHoursPending ? "待确认" : undefined}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    weeklyHours: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </label>
            <label className="flex items-end gap-2 pb-2">
              <input
                type="checkbox"
                checked={contractHoursPending}
                onChange={(e) => {
                  setContractHoursPending(e.target.checked);
                  if (e.target.checked) {
                    setForm((f) => ({ ...f, weeklyHours: null }));
                  } else {
                    setForm((f) => ({ ...f, weeklyHours: 40 }));
                  }
                }}
              />
              <span className="text-sm text-gray-600">待确认</span>
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">时薪 (€)</span>
              <input
                type="number"
                min={0}
                step={0.01}
                className={inputClass}
                value={form.hourlyRate}
                onChange={(e) =>
                  setForm((f) => ({ ...f, hourlyRate: Number(e.target.value) }))
                }
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium text-gray-700">状态</span>
              <select
                className={inputClass}
                value={form.status}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    status: e.target.value as StaffInput["status"],
                  }))
                }
              >
                <option value="在职">在职</option>
                <option value="离职">离职</option>
              </select>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-karuma-600 px-4 py-2 text-sm font-medium text-white hover:bg-karuma-700 disabled:opacity-60"
            >
              {saving ? t("common.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
