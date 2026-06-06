import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { turnos, diasSemana } from "@/lib/data/turnos";
import { AreaTurno } from "@/lib/types";

const areaConfig: Record<
  AreaTurno,
  { label: string; variant: "danger" | "info" | "purple"; color: string }
> = {
  cocina: { label: "Cocina", variant: "danger", color: "border-l-red-500" },
  sala: { label: "Sala", variant: "info", color: "border-l-blue-500" },
  barra: { label: "Barra", variant: "purple", color: "border-l-purple-500" },
};

export default function TurnosPage() {
  return (
    <div>
      <PageHeader
        title="Turnos"
        description="Calendario semanal — Semana del 2 al 8 de junio de 2026"
      />

      <div className="mb-4 flex flex-wrap gap-3">
        {(Object.keys(areaConfig) as AreaTurno[]).map((area) => (
          <Badge key={area} variant={areaConfig[area].variant}>
            {areaConfig[area].label}
          </Badge>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {diasSemana.map((dia) => {
          const turnosDia = turnos.filter((t) => t.dia === dia);
          const isWeekend = dia === "Sábado" || dia === "Domingo";

          return (
            <Card
              key={dia}
              title={dia}
              className={isWeekend ? "ring-1 ring-karuma-200" : ""}
            >
              {turnosDia.length === 0 ? (
                <p className="text-sm text-gray-400">Sin turnos asignados</p>
              ) : (
                <div className="space-y-2">
                  {turnosDia.map((turno) => (
                    <div
                      key={turno.id}
                      className={`rounded-lg border-l-4 bg-gray-50 px-3 py-2 ${areaConfig[turno.area].color}`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900">{turno.empleado}</p>
                        <Badge variant={areaConfig[turno.area].variant} >
                          {areaConfig[turno.area].label}
                        </Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {turno.horaInicio} – {turno.horaFin}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
