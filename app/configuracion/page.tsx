import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { DataTable } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { datosRestaurante, usuarios, configuracionSistema } from "@/lib/data/configuracion";
import { UsuarioSistema } from "@/lib/types";
import { Building2, Globe, Bell } from "lucide-react";

const rolLabel: Record<UsuarioSistema["rol"], string> = {
  admin: "Administrador",
  gerente: "Gerente",
  cocina: "Cocina",
  sala: "Sala",
};

export default function ConfiguracionPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Configuración" description="Ajustes del sistema y del restaurante" />

      <Card title="Datos del restaurante">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-karuma-50 p-2.5 text-karuma-600">
            <Building2 className="h-5 w-5" />
          </div>
          <dl className="grid flex-1 grid-cols-1 gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-gray-500">Nombre</dt>
              <dd className="font-medium text-gray-900">{datosRestaurante.nombre}</dd>
            </div>
            <div>
              <dt className="text-gray-500">CIF</dt>
              <dd className="font-medium text-gray-900">{datosRestaurante.cif}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Dirección</dt>
              <dd className="font-medium text-gray-900">{datosRestaurante.direccion}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Ciudad</dt>
              <dd className="font-medium text-gray-900">{datosRestaurante.ciudad}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Teléfono</dt>
              <dd className="font-medium text-gray-900">{datosRestaurante.telefono}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">{datosRestaurante.email}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-gray-500">Horario</dt>
              <dd className="font-medium text-gray-900">{datosRestaurante.horario}</dd>
            </div>
          </dl>
        </div>
      </Card>

      <section>
        <h2 className="mb-3 text-base font-semibold text-gray-900">Usuarios</h2>
        <DataTable<UsuarioSistema>
          data={usuarios}
          keyExtractor={(u) => u.id}
          mobileLabel={(u) => u.nombre}
          columns={[
            { key: "nombre", header: "Nombre" },
            { key: "email", header: "Email" },
            {
              key: "rol",
              header: "Rol",
              render: (u) => <StatusBadge variant="info">{rolLabel[u.rol]}</StatusBadge>,
            },
            {
              key: "activo",
              header: "Estado",
              render: (u) => (
                <StatusBadge variant={u.activo ? "success" : "neutral"}>
                  {u.activo ? "Activo" : "Inactivo"}
                </StatusBadge>
              ),
            },
          ]}
        />
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card title="Idioma y región">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-50 p-2.5 text-blue-600">
              <Globe className="h-5 w-5" />
            </div>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Idioma</dt>
                <dd className="font-medium">{configuracionSistema.idioma}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Zona horaria</dt>
                <dd className="font-medium">{configuracionSistema.zonaHoraria}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Moneda</dt>
                <dd className="font-medium">{configuracionSistema.moneda}</dd>
              </div>
            </dl>
          </div>
        </Card>

        <Card title="Notificaciones">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-50 p-2.5 text-amber-600">
              <Bell className="h-5 w-5" />
            </div>
            <dl className="flex-1 space-y-2 text-sm">
              {(
                [
                  ["Pedidos nuevos", configuracionSistema.notificaciones.pedidosNuevos],
                  ["Stock bajo", configuracionSistema.notificaciones.stockBajo],
                  ["Resumen diario", configuracionSistema.notificaciones.resumenDiario],
                  ["Marketing", configuracionSistema.notificaciones.marketing],
                ] as const
              ).map(([label, activo]) => (
                <div key={label} className="flex items-center justify-between">
                  <dt className="text-gray-700">{label}</dt>
                  <dd>
                    <StatusBadge variant={activo ? "success" : "neutral"}>
                      {activo ? "Activado" : "Desactivado"}
                    </StatusBadge>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Card>
      </div>
    </div>
  );
}
