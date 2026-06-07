"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock,
  Download,
  Pencil,
  Plus,
  Search,
  Trash2,
  UserCheck,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  DIAS_SEMANA,
  EMPTY_FORM,
  ESTADOS_EMPLEADO,
  actualizarHorasDia,
  calcularNomina,
  computeStats,
  empleadoToForm,
  emptyHorario,
  exportEmpleadosCsv,
  genId,
  horasExtra,
  horasMes,
  horasSemana,
  loadEmpleados,
  parseForm,
  saveEmpleados,
  type EmpleadoForm,
} from "@/lib/personal/helpers";
import { DiaSemana, EmpleadoPersonal, EstadoEmpleado, HorarioDia } from "@/lib/types";

type Tab = "empleados" | "horarios" | "nomina";
type ModalKind = "empleado" | "horario" | "confirm" | null;

const estadoConfig: Record<
  EstadoEmpleado,
  { variant: "success" | "info" | "danger"; label: string }
> = {
  activo: { variant: "success", label: "Activo" },
  vacaciones: { variant: "info", label: "Vacaciones" },
  baja: { variant: "danger", label: "Baja" },
};

function Modal({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-gray-900/50 p-0 sm:items-center sm:p-4">
      <div
        className={`max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl ${wide ? "sm:max-w-2xl" : "sm:max-w-lg"}`}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Cerrar"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-gray-600">
        {label}
        {required && " *"}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-karuma-500 focus:outline-none focus:ring-1 focus:ring-karuma-500";

export function PersonalPanel() {
  const [empleados, setEmpleados] = useState<EmpleadoPersonal[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("empleados");
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState("");
  const [modal, setModal] = useState<ModalKind>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<EmpleadoForm>(EMPTY_FORM);
  const [horarioEmpId, setHorarioEmpId] = useState<string>("");
  const [horarioDraft, setHorarioDraft] = useState<Record<DiaSemana, HorarioDia> | null>(null);
  const [confirmMessage, setConfirmMessage] = useState("");
  const [confirmAction, setConfirmAction] = useState<(() => void) | null>(null);

  useEffect(() => {
    try {
      const data = loadEmpleados();
      setEmpleados(data);
      if (data.length > 0) setHorarioEmpId(data[0].id);
    } finally {
      setLoaded(true);
    }
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(""), 2500);
  };

  const persist = (next: EmpleadoPersonal[]) => {
    setEmpleados(next);
    saveEmpleados(next);
  };

  const stats = useMemo(() => computeStats(empleados), [empleados]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return empleados;
    return empleados.filter(
      (e) =>
        e.nombre.toLowerCase().includes(q) ||
        e.cargo.toLowerCase().includes(q) ||
        e.telefono.includes(q) ||
        e.estado.toLowerCase().includes(q),
    );
  }, [empleados, search]);

  const horarioEmpleado = empleados.find((e) => e.id === horarioEmpId);

  const openEmpleadoModal = (mode: "add" | "edit", id?: string) => {
    setEditId(mode === "edit" ? (id ?? null) : null);
    if (mode === "edit" && id) {
      const emp = empleados.find((e) => e.id === id);
      if (emp) setForm(empleadoToForm(emp));
    } else {
      setForm(EMPTY_FORM);
    }
    setModal("empleado");
  };

  const saveEmpleado = () => {
    const parsed = parseForm(form);
    if (!parsed) {
      showToast("Completa nombre y cargo");
      return;
    }

    if (editId) {
      const idx = empleados.findIndex((e) => e.id === editId);
      if (idx === -1) return;
      const next = [...empleados];
      next[idx] = { ...next[idx], ...parsed };
      persist(next);
      showToast("Empleado actualizado");
    } else {
      const nuevo: EmpleadoPersonal = {
        id: genId(),
        ...parsed,
        horario: emptyHorario(),
      };
      persist([...empleados, nuevo]);
      setHorarioEmpId(nuevo.id);
      showToast("Empleado añadido");
    }

    setModal(null);
    setForm(EMPTY_FORM);
    setEditId(null);
  };

  const confirmDelete = (id: string) => {
    const emp = empleados.find((e) => e.id === id);
    if (!emp) return;
    setConfirmMessage(`¿Eliminar a «${emp.nombre}»? Esta acción no se puede deshacer.`);
    setConfirmAction(() => () => {
      const next = empleados.filter((e) => e.id !== id);
      persist(next);
      if (horarioEmpId === id && next.length > 0) setHorarioEmpId(next[0].id);
      setModal(null);
      showToast("Empleado eliminado");
    });
    setModal("confirm");
  };

  const openHorarioEditor = (id: string) => {
    const emp = empleados.find((e) => e.id === id);
    if (!emp) return;
    setHorarioEmpId(id);
    setHorarioDraft(JSON.parse(JSON.stringify(emp.horario)));
    setModal("horario");
  };

  const updateHorarioDia = (dia: DiaSemana, field: keyof HorarioDia, value: string | number) => {
    if (!horarioDraft) return;
    const updated = actualizarHorasDia({
      ...horarioDraft[dia],
      [field]: value,
    });
    setHorarioDraft({ ...horarioDraft, [dia]: updated });
  };

  const saveHorario = () => {
    if (!horarioDraft || !horarioEmpId) return;
    const next = empleados.map((e) =>
      e.id === horarioEmpId ? { ...e, horario: horarioDraft } : e,
    );
    persist(next);
    setModal(null);
    setHorarioDraft(null);
    showToast("Horario guardado");
  };

  const updateForm = (field: keyof EmpleadoForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div>
      <PageHeader title="Personal" description="Empleados, horarios y nómina estimada">
        <Button size="sm" className="gap-1.5" onClick={() => openEmpleadoModal("add")}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Nuevo empleado</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:mb-6 sm:grid-cols-3 sm:gap-4">
        <StatCard
          title="Empleados activos"
          value={String(stats.activos)}
          icon={UserCheck}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Horas semana"
          value={`${stats.horasSemanaTotal}h`}
          subtitle="Equipo activo"
          icon={Clock}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Nómina estimada"
          value={formatCurrency(stats.nominaTotal)}
          subtitle="Total mensual"
          icon={Wallet}
          iconColor="bg-purple-50 text-purple-600"
        />
      </div>

      <div className="mb-4 flex rounded-xl border border-gray-200 bg-white p-1 shadow-sm">
        {(
          [
            { id: "empleados", label: "Empleados", icon: UserCheck },
            { id: "horarios", label: "Horarios", icon: CalendarDays },
            { id: "nomina", label: "Nómina", icon: Wallet },
          ] as const
        ).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2.5 text-xs font-medium transition-colors sm:text-sm ${
              tab === id ? "bg-karuma-600 text-white" : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </button>
        ))}
      </div>

      {tab === "empleados" && (
        <>
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar empleado…"
                className={`${inputClass} pl-9`}
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                exportEmpleadosCsv(filtered.length > 0 && search.trim() ? filtered : empleados);
                showToast("CSV exportado");
              }}
            >
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>

          {!loaded ? (
            <div className="rounded-xl border border-gray-200 bg-white p-10 text-center text-sm text-gray-500 shadow-sm">
              Cargando personal…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
              {empleados.length === 0
                ? "Sin empleados. Pulsa Nuevo para añadir."
                : "Sin resultados para tu búsqueda."}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filtered.map((emp) => {
                const nomina = calcularNomina(emp);
                return (
                  <article
                    key={emp.id}
                    className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-gray-900">
                          {emp.nombre}
                        </h3>
                        <p className="text-xs text-gray-500">{emp.cargo}</p>
                      </div>
                      <StatusBadge variant={estadoConfig[emp.estado].variant}>
                        {estadoConfig[emp.estado].label}
                      </StatusBadge>
                    </div>

                    <dl className="space-y-2 text-sm">
                      <div className="flex justify-between gap-2">
                        <dt className="text-gray-500">Teléfono</dt>
                        <dd className="text-gray-900">{emp.telefono || "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-gray-500">Fecha de alta</dt>
                        <dd className="text-gray-900">{formatDate(emp.fechaAlta)}</dd>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-gray-500">Salario base</dt>
                        <dd className="font-medium text-gray-900">
                          {formatCurrency(emp.salarioBase)}
                        </dd>
                      </div>
                      <div className="grid grid-cols-3 gap-2 rounded-lg bg-gray-50 px-2 py-2">
                        <div className="text-center">
                          <p className="text-[10px] text-gray-500">Semana</p>
                          <p className="text-sm font-semibold text-gray-900">{horasSemana(emp)}h</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-gray-500">Mes</p>
                          <p className="text-sm font-semibold text-gray-900">{horasMes(emp)}h</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] text-amber-700">Extra</p>
                          <p className="text-sm font-semibold text-amber-800">{horasExtra(emp)}h</p>
                        </div>
                      </div>
                      <div className="flex justify-between gap-2">
                        <dt className="text-gray-500">Total estimado</dt>
                        <dd className="font-medium text-karuma-600">
                          {formatCurrency(nomina.totalEstimado)}
                        </dd>
                      </div>
                    </dl>

                    <div className="mt-4 flex flex-wrap gap-2 border-t border-gray-100 pt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => openHorarioEditor(emp.id)}
                      >
                        <CalendarDays className="h-3.5 w-3.5" />
                        Horario
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
                        onClick={() => openEmpleadoModal("edit", emp.id)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-red-600 hover:bg-red-50"
                        onClick={() => confirmDelete(emp.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Eliminar
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === "horarios" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <Field label="Empleado">
              <select
                value={horarioEmpId}
                onChange={(e) => setHorarioEmpId(e.target.value)}
                className={inputClass}
              >
                {empleados.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.nombre} — {e.cargo}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {horarioEmpleado ? (
            <Card title={`Horario semanal — ${horarioEmpleado.nombre}`}>
              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
                      <th className="pb-3 pr-4">Día</th>
                      <th className="pb-3 pr-4">Turno comida</th>
                      <th className="pb-3 pr-4">Turno cena</th>
                      <th className="pb-3">Horas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {DIAS_SEMANA.map((dia) => {
                      const h = horarioEmpleado.horario[dia];
                      return (
                        <tr key={dia}>
                          <td className="py-3 pr-4 font-medium text-gray-900">{dia}</td>
                          <td className="py-3 pr-4 text-gray-600">{h.turnoComida || "—"}</td>
                          <td className="py-3 pr-4 text-gray-600">{h.turnoCena || "—"}</td>
                          <td className="py-3 font-medium text-gray-900">{h.horas}h</td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-gray-200">
                      <td colSpan={3} className="pt-3 text-sm font-semibold text-gray-700">
                        Total semana
                      </td>
                      <td className="pt-3 text-sm font-bold text-karuma-600">
                        {horasSemana(horarioEmpleado)}h
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="space-y-3 md:hidden">
                {DIAS_SEMANA.map((dia) => {
                  const h = horarioEmpleado.horario[dia];
                  return (
                    <div
                      key={dia}
                      className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-3"
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="font-semibold text-gray-900">{dia}</span>
                        <span className="text-sm font-medium text-karuma-600">{h.horas}h</span>
                      </div>
                      <p className="text-xs text-gray-500">
                        Comida: <span className="text-gray-800">{h.turnoComida || "—"}</span>
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Cena: <span className="text-gray-800">{h.turnoCena || "—"}</span>
                      </p>
                    </div>
                  );
                })}
                <p className="text-right text-sm font-semibold text-gray-700">
                  Total semana:{" "}
                  <span className="text-karuma-600">{horasSemana(horarioEmpleado)}h</span>
                </p>
              </div>

              <div className="mt-4 border-t border-gray-100 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => openHorarioEditor(horarioEmpleado.id)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Editar horario
                </Button>
              </div>
            </Card>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
              No hay empleados registrados.
            </div>
          )}
        </div>
      )}

      {tab === "nomina" && (
        <div className="space-y-3">
          {empleados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
              No hay datos de nómina.
            </div>
          ) : (
            empleados.map((emp) => {
              const nomina = calcularNomina(emp);
              return (
                <article
                  key={emp.id}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-gray-900">{emp.nombre}</h3>
                      <p className="text-xs text-gray-500">{emp.cargo}</p>
                    </div>
                    <StatusBadge variant={estadoConfig[emp.estado].variant}>
                      {estadoConfig[emp.estado].label}
                    </StatusBadge>
                  </div>

                  <div className="mb-4 grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="rounded-lg bg-gray-50 px-3 py-2 text-center">
                      <p className="text-[10px] uppercase text-gray-500 sm:text-xs">Horas semana</p>
                      <p className="text-lg font-bold text-gray-900">{horasSemana(emp)}h</p>
                    </div>
                    <div className="rounded-lg bg-gray-50 px-3 py-2 text-center">
                      <p className="text-[10px] uppercase text-gray-500 sm:text-xs">Horas mes</p>
                      <p className="text-lg font-bold text-gray-900">{horasMes(emp)}h</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 px-3 py-2 text-center">
                      <p className="text-[10px] uppercase text-amber-700 sm:text-xs">Horas extra</p>
                      <p className="text-lg font-bold text-amber-800">{horasExtra(emp)}h</p>
                    </div>
                  </div>

                  <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-3">
                    <div className="flex justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 sm:flex-col sm:justify-start">
                      <dt className="text-gray-500">Salario base</dt>
                      <dd className="font-medium text-gray-900">
                        {formatCurrency(nomina.salarioBase)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 sm:flex-col sm:justify-start">
                      <dt className="text-gray-500">Horas extra</dt>
                      <dd className="font-medium text-amber-700">
                        +{formatCurrency(nomina.importeExtra)}
                      </dd>
                    </div>
                    <div className="flex justify-between gap-2 rounded-lg border border-karuma-100 bg-karuma-50 px-3 py-2 sm:flex-col sm:justify-start">
                      <dt className="font-medium text-karuma-700">Total estimado</dt>
                      <dd className="text-lg font-bold text-karuma-700">
                        {formatCurrency(nomina.totalEstimado)}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })
          )}
        </div>
      )}

      <Modal
        open={modal === "empleado"}
        title={editId ? "Editar empleado" : "Nuevo empleado"}
        onClose={() => setModal(null)}
      >
        <div className="space-y-4">
          <Field label="Nombre" required>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => updateForm("nombre", e.target.value)}
              placeholder="Ej. María García"
              className={inputClass}
            />
          </Field>
          <Field label="Cargo" required>
            <input
              type="text"
              value={form.cargo}
              onChange={(e) => updateForm("cargo", e.target.value)}
              placeholder="Ej. Camarera"
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Teléfono">
              <input
                type="tel"
                value={form.telefono}
                onChange={(e) => updateForm("telefono", e.target.value)}
                placeholder="+34 600 000 000"
                className={inputClass}
              />
            </Field>
            <Field label="Fecha de alta">
              <input
                type="date"
                value={form.fechaAlta}
                onChange={(e) => updateForm("fechaAlta", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Salario base">
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.salarioBase}
                onChange={(e) => updateForm("salarioBase", e.target.value)}
                placeholder="1400.00"
                className={inputClass}
              />
            </Field>
            <Field label="Estado">
              <select
                value={form.estado}
                onChange={(e) => updateForm("estado", e.target.value)}
                className={inputClass}
              >
                {ESTADOS_EMPLEADO.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button onClick={saveEmpleado}>Guardar</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={modal === "horario"}
        title={horarioEmpleado ? `Horario — ${horarioEmpleado.nombre}` : "Horario"}
        onClose={() => {
          setModal(null);
          setHorarioDraft(null);
        }}
        wide
      >
        {horarioDraft && (
          <div className="space-y-3">
            {DIAS_SEMANA.map((dia) => (
              <div
                key={dia}
                className="rounded-lg border border-gray-100 bg-gray-50 p-3 sm:grid sm:grid-cols-4 sm:items-end sm:gap-3"
              >
                <p className="mb-2 text-sm font-semibold text-gray-900 sm:mb-0">{dia}</p>
                <Field label="Turno comida">
                  <input
                    type="text"
                    value={horarioDraft[dia].turnoComida}
                    onChange={(e) => updateHorarioDia(dia, "turnoComida", e.target.value)}
                    placeholder="11:00-16:00"
                    className={inputClass}
                  />
                </Field>
                <Field label="Turno cena">
                  <input
                    type="text"
                    value={horarioDraft[dia].turnoCena}
                    onChange={(e) => updateHorarioDia(dia, "turnoCena", e.target.value)}
                    placeholder="17:00-23:30"
                    className={inputClass}
                  />
                </Field>
                <Field label="Horas">
                  <div className="flex h-[42px] items-center rounded-lg border border-gray-200 bg-white px-3 text-sm font-semibold text-karuma-600">
                    {horarioDraft[dia].horas}h
                  </div>
                </Field>
              </div>
            ))}
            <div className="flex justify-end gap-2 border-t border-gray-100 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setModal(null);
                  setHorarioDraft(null);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={saveHorario}>Guardar horario</Button>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={modal === "confirm"} title="Confirmar" onClose={() => setModal(null)}>
        <p className="mb-4 text-sm leading-relaxed text-gray-600">{confirmMessage}</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setModal(null)}>
            Cancelar
          </Button>
          <Button className="bg-red-600 hover:bg-red-700" onClick={() => confirmAction?.()}>
            Eliminar
          </Button>
        </div>
      </Modal>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-900 shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
