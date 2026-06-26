"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ClipboardList,
  ListChecks,
  Plus,
  Search,
  Wrench,
  X,
} from "lucide-react";
import { ErpPageIntro } from "@/components/layout/ErpPageIntro";
import { PageContent } from "@/components/layout/PageContent";
import { StatCard } from "@/components/ui/StatCard";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import {
  formatDateLabel,
  isSameWeek,
  SHIFT_LOG_SEED,
  SHIFT_LOG_SHIFT_LABEL,
  SHIFT_LOG_STATUS_LABEL,
  SHIFT_LOG_STATUS_STYLE,
  type ShiftLog,
  type ShiftLogStatus,
} from "@/lib/shift-log/mock";

const STATUSES: ShiftLogStatus[] = ["Pendiente", "En proceso", "Completado"];
const SHIFTS = ["Comida", "Cena", "Día completo"];

const inputClass =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:border-karuma-500 focus:outline-none focus:ring-2 focus:ring-karuma-500/20";

const emptyForm = (): Omit<ShiftLog, "id"> => ({
  date: "2026-06-07",
  shift: "Cena",
  responsible: "",
  manager: "Maria",
  staffCount: 10,
  issues: "",
  stockShortage: "",
  equipmentIssues: "",
  customerComplaints: "",
  cashVariance: "",
  notes: "",
  status: "Pendiente",
});

function StatusBadge({ status }: { status: ShiftLogStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${SHIFT_LOG_STATUS_STYLE[status]}`}
    >
      {SHIFT_LOG_STATUS_LABEL[status]}
    </span>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[7rem_1fr] gap-2 border-b border-gray-50 py-2.5 text-sm last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-900">{value || "—"}</span>
    </div>
  );
}

export default function ShiftLogPage() {
  const { t } = useLanguage();
  const [records, setRecords] = useState<ShiftLog[]>(SHIFT_LOG_SEED);
  const [selected, setSelected] = useState<ShiftLog | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const [filterDate, setFilterDate] = useState("");
  const [filterResponsible, setFilterResponsible] = useState("");
  const [filterStatus, setFilterStatus] = useState<ShiftLogStatus | "">("");

  const today = "2026-06-07";

  const stats = useMemo(() => {
    const refDate = new Date(`${today}T12:00:00`);
    const todayCount = records.filter((r) => r.date === today).length;
    const weekCount = records.filter((r) => isSameWeek(r.date, refDate)).length;
    const pendingCount = records.filter((r) => r.status === "Pendiente").length;
    const equipmentCount = records.filter((r) => r.equipmentIssues.trim()).length;
    return { todayCount, weekCount, pendingCount, equipmentCount };
  }, [records]);

  const filtered = useMemo(() => {
    return records.filter((r) => {
      if (filterDate && r.date !== filterDate) return false;
      if (filterResponsible && !r.responsible.includes(filterResponsible.trim())) return false;
      if (filterStatus && r.status !== filterStatus) return false;
      return true;
    });
  }, [records, filterDate, filterResponsible, filterStatus]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.responsible.trim()) return;
    const next: ShiftLog = {
      ...form,
      id: `sl-${Date.now()}`,
      responsible: form.responsible.trim(),
    };
    setRecords((prev) => [next, ...prev]);
    setFormOpen(false);
    setForm(emptyForm());
  };

  const pageDescription = `${t("pages.shiftLog.description")} · ${t("pages.shiftLog.mockHint")}`;

  return (
    <PageContent>
      <ErpPageIntro
        lead={formatDateLabel(today)}
        description={pageDescription}
        actions={
          <button
            type="button"
            onClick={() => {
              setForm(emptyForm());
              setFormOpen(true);
            }}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-karuma-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-karuma-700"
          >
            <Plus className="h-4 w-4" />
            Nuevo registro
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          title="Registros de hoy"
          value={String(stats.todayCount)}
          icon={ClipboardList}
          iconColor="bg-karuma-50 text-karuma-600"
        />
        <StatCard
          title="Registros de la semana"
          value={String(stats.weekCount)}
          icon={CalendarDays}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Pendientes"
          value={String(stats.pendingCount)}
          icon={ListChecks}
          iconColor="bg-amber-50 text-amber-600"
        />
        <StatCard
          title="Problemas de equipo"
          value={String(stats.equipmentCount)}
          icon={Wrench}
          iconColor="bg-red-50 text-red-600"
        />
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-500">Por fecha</span>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className={inputClass}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-500">Por responsable</span>
            <input
              type="text"
              value={filterResponsible}
              onChange={(e) => setFilterResponsible(e.target.value)}
              placeholder="Maria"
              className={inputClass}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs font-medium text-gray-500">Por estado</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as ShiftLogStatus | "")}
              className={inputClass}
            >
              <option value="">Todos</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {SHIFT_LOG_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </label>
          {(filterDate || filterResponsible || filterStatus) && (
            <button
              type="button"
              onClick={() => {
                setFilterDate("");
                setFilterResponsible("");
                setFilterStatus("");
              }}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                <th className="px-4 py-3">Fecha</th>
                <th className="px-4 py-3">Turno</th>
                <th className="px-4 py-3">Responsable</th>
                <th className="px-4 py-3">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-gray-500">
                    <Search className="mx-auto mb-2 h-5 w-5 text-gray-300" />
                    No hay registros coincidentes
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    onClick={() => setSelected(row)}
                    className="cursor-pointer hover:bg-gray-50/80"
                  >
                    <td className="px-4 py-3.5 font-medium text-gray-900">
                      {formatDateLabel(row.date)}
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{SHIFT_LOG_SHIFT_LABEL[row.shift] ?? row.shift}</td>
                    <td className="px-4 py-3.5 text-gray-600">{row.responsible}</td>
                    <td className="px-4 py-3.5">
                      <StatusBadge status={row.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Detalle del cambio de turno</h2>
                <p className="mt-1 text-sm text-gray-500">
                  {formatDateLabel(selected.date)} · {SHIFT_LOG_SHIFT_LABEL[selected.shift] ?? selected.shift}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50/50 px-4 py-1">
              <DetailRow label="Responsable" value={selected.responsible} />
              <DetailRow label="Encargado" value={selected.manager} />
              <DetailRow label="Equipo" value={String(selected.staffCount)} />
              <DetailRow label="Incidencias" value={selected.issues} />
              <DetailRow label="Faltas de stock" value={selected.stockShortage} />
              <DetailRow label="Equipo" value={selected.equipmentIssues} />
              <DetailRow label="Quejas" value={selected.customerComplaints} />
              <DetailRow label="Caja" value={selected.cashVariance} />
              <DetailRow label="Notas" value={selected.notes} />
              <div className="grid grid-cols-[7rem_1fr] gap-2 py-2.5 text-sm">
                <span className="text-gray-500">Estado</span>
                <StatusBadge status={selected.status} />
              </div>
            </div>
            {selected.equipmentIssues && (
              <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Incluye problema de equipo. Requiere seguimiento.
              </p>
            )}
          </div>
        </div>
      )}

      {formOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-gray-900">Nuevo registro de cambio de turno</h2>
            <form onSubmit={handleCreate} className="mt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-gray-700">Fecha *</span>
                  <input
                    type="date"
                    required
                    className={inputClass}
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-gray-700">Turno *</span>
                  <select
                    className={inputClass}
                    value={form.shift}
                    onChange={(e) => setForm((f) => ({ ...f, shift: e.target.value }))}
                  >
                    {SHIFTS.map((s) => (
                      <option key={s} value={s}>
                        {SHIFT_LOG_SHIFT_LABEL[s] ?? s}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-gray-700">Responsable *</span>
                  <input
                    required
                    className={inputClass}
                    value={form.responsible}
                    onChange={(e) => setForm((f) => ({ ...f, responsible: e.target.value }))}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-sm font-medium text-gray-700">Encargado</span>
                  <input
                    className={inputClass}
                    value={form.manager}
                    onChange={(e) => setForm((f) => ({ ...f, manager: e.target.value }))}
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700">Personas en turno</span>
                <input
                  type="number"
                  min={0}
                  className={inputClass}
                  value={form.staffCount}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, staffCount: Number(e.target.value) }))
                  }
                />
              </label>
              {(
                [
                  ["issues", "Incidencias"],
                  ["stockShortage", "Faltas de stock"],
                  ["equipmentIssues", "Problemas de equipo"],
                  ["customerComplaints", "Quejas de clientes"],
                  ["cashVariance", "Diferencia de caja"],
                  ["notes", "Notas"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block space-y-1">
                  <span className="text-sm font-medium text-gray-700">{label}</span>
                  <textarea
                    rows={2}
                    className={inputClass}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  />
                </label>
              ))}
              <label className="block space-y-1">
                <span className="text-sm font-medium text-gray-700">Estado</span>
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value as ShiftLogStatus }))
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {SHIFT_LOG_STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-karuma-600 px-4 py-2 text-sm font-medium text-white hover:bg-karuma-700"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageContent>
  );
}
