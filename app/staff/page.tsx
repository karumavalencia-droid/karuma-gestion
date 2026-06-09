"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StaffFormModal } from "@/components/staff/StaffFormModal";
import { interpolate } from "@/lib/i18n";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { formatContractHours, formatStandardShift } from "@/lib/staff/format";
import { formatFixedRestDays } from "@/lib/staff/rest-days";
import type { StaffDepartment, StaffInput, StaffMember } from "@/lib/staff/types";

const DEPT_ORDER: Record<StaffDepartment, number> = {
  Sala: 0,
  Sushi: 1,
  "Hot Kitchen": 2,
  Dishwasher: 3,
};

export default function StaffPage() {
  const { t } = useLanguage();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [saving, setSaving] = useState(false);

  const loadStaff = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/staff");
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("staff.loadError"));
      }
      const data = (await res.json()) as StaffMember[];
      setStaff(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("staff.loadError"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadStaff();
  }, [loadStaff]);

  const sortedStaff = useMemo(
    () =>
      [...staff].sort((a, b) => {
        const dept = DEPT_ORDER[a.department] - DEPT_ORDER[b.department];
        return dept !== 0 ? dept : a.name.localeCompare(b.name);
      }),
    [staff],
  );

  const openCreate = () => {
    setModalMode("create");
    setEditing(null);
    setModalOpen(true);
  };

  const openEdit = (row: StaffMember) => {
    setModalMode("edit");
    setEditing(row);
    setModalOpen(true);
  };

  const handleSave = async (input: StaffInput) => {
    setSaving(true);
    setError("");
    try {
      const url = modalMode === "create" ? "/api/staff" : `/api/staff/${editing?.id}`;
      const method = modalMode === "create" ? "POST" : "PUT";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("staff.saveError"));
      }

      setModalOpen(false);
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("staff.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row: StaffMember) => {
    if (!window.confirm(interpolate(t("staff.deleteConfirm"), { name: row.name }))) return;

    setError("");
    try {
      const res = await fetch(`/api/staff/${row.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? t("staff.deleteError"));
      }
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("staff.deleteError"));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {interpolate(t("staff.subtitle"), { count: staff.length })}
        </p>
        <button
          type="button"
          onClick={openCreate}
          className="rounded-lg bg-karuma-600 px-4 py-2 text-sm font-medium text-white hover:bg-karuma-700"
        >
          {t("staff.add")}
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">{t("staff.colName")}</th>
                <th className="px-4 py-3">{t("staff.colDepartment")}</th>
                <th className="px-4 py-3">{t("staff.colPosition")}</th>
                <th className="px-4 py-3">{t("staff.colContractHours")}</th>
                <th className="px-4 py-3">{t("staff.colRestDays")}</th>
                <th className="px-4 py-3">{t("staff.colShift")}</th>
                <th className="px-4 py-3">{t("staff.colStatus")}</th>
                <th className="px-4 py-3">{t("common.actions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {t("common.loading")}
                  </td>
                </tr>
              ) : sortedStaff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {t("staff.empty")}
                  </td>
                </tr>
              ) : (
                sortedStaff.map((row) => (
                  <tr key={row.id} className="hover:bg-gray-50/80">
                    <td className="px-4 py-3.5 font-medium text-gray-900">
                      <Link
                        href={`/staff/${row.id}`}
                        className="text-karuma-600 hover:text-karuma-700 hover:underline"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{row.department}</td>
                    <td className="px-4 py-3.5 text-gray-600">{row.position}</td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {formatContractHours(row.weeklyHours)}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {formatFixedRestDays(row)}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">
                      {formatStandardShift(row.fixedShift)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
                          row.status === "在职"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
                            : "bg-gray-50 text-gray-600 ring-gray-500/20"
                        }`}
                      >
                        {row.status === "在职"
                          ? t("staff.statusActive")
                          : t("staff.statusInactive")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Link
                          href={`/staff/${row.id}`}
                          className="text-sm font-medium text-gray-600 hover:text-gray-900"
                        >
                          {t("common.detail")}
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEdit(row)}
                          className="text-sm font-medium text-karuma-600 hover:text-karuma-700"
                        >
                          {t("common.edit")}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(row)}
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          {t("common.delete")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <StaffFormModal
        open={modalOpen}
        mode={modalMode}
        initial={editing}
        saving={saving}
        onClose={() => setModalOpen(false)}
        onSave={(input) => void handleSave(input)}
      />
    </div>
  );
}
