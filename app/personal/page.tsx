import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { StatCard } from "@/components/ui/StatCard";
import { Card } from "@/components/ui/Card";
import { empleados } from "@/lib/data/empleados";
import { turnos, diasSemana } from "@/lib/data/turnos";
import { Empleado } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { UserCheck, Clock, Wallet } from "lucide-react";

const estadoConfig = {
  activo: { variant: "success" as const, label: "Activo" },
  vacaciones: { variant: "info" as const, label: "Vacaciones" },
  baja: { variant: "danger" as const, label: "Baja" },
};

export default function PersonalPage() {
  const activos = empleados.filter((e) => e.estado === "activo");
  const totalHoras = activos.reduce((s, e) => s + e.horasMes, 0);
  const totalSueldos = activos.reduce((s, e) => s + e.sueldoEstimado, 0);
  const turnosHoy = turnos.filter((t) => t.dia === "Viernes");

  return (
    <div className="space-y-6">
      <PageHeader title="Personal" description="Empleados, turnos y nómina estimada" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          title="Empleados activos"
          value={String(activos.length)}
          icon={UserCheck}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="Horas del mes"
          value={`${totalHoras}h`}
          icon={Clock}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="Sueldo estimado"
          value={formatCurrency(totalSueldos)}
          subtitle="Nómina mensual"
          icon={Wallet}
          iconColor="bg-purple-50 text-purple-600"
        />
      </div>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Empleados</h2>
        <DataTable<Empleado>
          data={empleados}
          keyExtractor={(e) => e.id}
          mobileLabel={(e) => e.nombre}
          columns={[
            { key: "nombre", header: "Nombre" },
            { key: "puesto", header: "Puesto" },
            {
              key: "horasMes",
              header: "Horas trabajadas",
              render: (e) => (e.horasMes > 0 ? `${e.horasMes}h` : "—"),
            },
            {
              key: "sueldoEstimado",
              header: "Sueldo estimado",
              render: (e) =>
                e.sueldoEstimado > 0 ? formatCurrency(e.sueldoEstimado) : "—",
            },
            {
              key: "estado",
              header: "Estado",
              render: (e) => (
                <StatusBadge variant={estadoConfig[e.estado].variant}>
                  {estadoConfig[e.estado].label}
                </StatusBadge>
              ),
            },
          ]}
        />
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Turnos de hoy</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {turnosHoy.map((turno) => (
            <Card key={turno.id}>
              <p className="font-medium text-gray-900">{turno.empleado}</p>
              <p className="mt-1 text-sm text-gray-500">
                {turno.horaInicio} – {turno.horaFin}
              </p>
              <div className="mt-2">
                <StatusBadge
                  variant={
                    turno.area === "cocina"
                      ? "danger"
                      : turno.area === "sala"
                        ? "info"
                        : "purple"
                  }
                >
                  {turno.area.charAt(0).toUpperCase() + turno.area.slice(1)}
                </StatusBadge>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Calendario semanal</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {diasSemana.map((dia) => {
            const count = turnos.filter((t) => t.dia === dia).length;
            return (
              <div
                key={dia}
                className="flex min-w-[72px] shrink-0 flex-col items-center rounded-lg border border-gray-200 bg-white px-3 py-2 text-center"
              >
                <span className="text-xs text-gray-500">{dia.slice(0, 3)}</span>
                <span className="text-lg font-bold text-gray-900">{count}</span>
                <span className="text-[10px] text-gray-400">turnos</span>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
