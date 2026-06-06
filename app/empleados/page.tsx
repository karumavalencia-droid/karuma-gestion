import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable } from "@/components/ui/DataTable";
import { Badge } from "@/components/ui/Badge";
import { StatCard } from "@/components/ui/StatCard";
import { empleados } from "@/lib/data/empleados";
import { Empleado } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { UserCheck, UserX, Palmtree } from "lucide-react";

const estadoConfig = {
  activo: { variant: "success" as const, label: "Activo" },
  vacaciones: { variant: "info" as const, label: "Vacaciones" },
  baja: { variant: "danger" as const, label: "Baja" },
};

export default function EmpleadosPage() {
  const activos = empleados.filter((e) => e.estado === "activo").length;
  const vacaciones = empleados.filter((e) => e.estado === "vacaciones").length;
  const baja = empleados.filter((e) => e.estado === "baja").length;

  return (
    <div>
      <PageHeader
        title="Empleados"
        description={`${empleados.length} empleados registrados`}
      />

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Activos"
          value={String(activos)}
          icon={UserCheck}
          iconColor="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          title="De vacaciones"
          value={String(vacaciones)}
          icon={Palmtree}
          iconColor="bg-blue-50 text-blue-600"
        />
        <StatCard
          title="De baja"
          value={String(baja)}
          icon={UserX}
          iconColor="bg-red-50 text-red-600"
        />
      </div>

      <DataTable<Empleado>
        data={empleados}
        keyExtractor={(e) => e.id}
        columns={[
          { key: "nombre", header: "Nombre" },
          { key: "puesto", header: "Puesto" },
          { key: "telefono", header: "Teléfono" },
          {
            key: "fechaEntrada",
            header: "Fecha de entrada",
            render: (e) => formatDate(e.fechaEntrada),
          },
          {
            key: "estado",
            header: "Estado",
            render: (e) => (
              <Badge variant={estadoConfig[e.estado].variant}>
                {estadoConfig[e.estado].label}
              </Badge>
            ),
          },
        ]}
      />
    </div>
  );
}
