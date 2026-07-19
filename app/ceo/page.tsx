import { cookies } from "next/headers";
import { ChangeCenterPanel } from "@/components/ceo/ChangeCenterPanel";
import { CeoChatPanel } from "@/components/ceo/CeoChatPanel";
import { canViewCeo, isCeoAdmin } from "@/lib/auth/guards";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CeoPage() {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value;
  const user = await verifySessionToken(token);

  if (!canViewCeo(user)) {
    return null;
  }

  const canManageActions = isCeoAdmin(user);

  return (
    <div className="space-y-6 px-4 py-4 sm:px-6 lg:px-8">
      <section className="overflow-hidden rounded-3xl border border-gray-200 bg-[linear-gradient(135deg,#0f172a_0%,#111827_42%,#1f2937_100%)] p-5 text-white shadow-xl sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-300">AI CEO</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Karuma Executive Desk</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
              Todos pueden hacer preguntas básicas. Solo tú ves y apruebas cambios del sistema. La idea es simple:
              preguntas rápidas para todos, ajustes controlados solo por owner/admin.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs font-medium">
              <span className="rounded-full bg-white/10 px-3 py-1 text-amber-100">Preguntas básicas</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-amber-100">Resumen ejecutivo</span>
              <span className="rounded-full bg-white/10 px-3 py-1 text-amber-100">Cambios solo para ti</span>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:w-[340px]">
            <a
              href="#ceo-chat"
              className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-gray-900 transition hover:bg-amber-50"
            >
              Ir a preguntas
            </a>
            <a
              href={canManageActions ? "#ceo-change-center" : "#ceo-chat"}
              className="rounded-2xl border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/15"
            >
              {canManageActions ? "Ver cambios" : "Solo consultar"}
            </a>
          </div>
        </div>
      </section>

      <section id="ceo-chat" className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">Panel</p>
            <h2 className="mt-1 text-xl font-semibold text-gray-900">
              {canManageActions ? "Preguntar y aprobar" : "Preguntar al AI CEO"}
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              {canManageActions
                ? "Aquí puedes consultar datos y revisar acciones sugeridas antes de tocar el sistema."
                : "Aquí puedes hacer preguntas sobre ventas, turnos y reservas sin tocar permisos de edición."}
            </p>
          </div>
          <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            {canManageActions ? "Modo gestión activo" : "Modo preguntas"}
          </div>
        </div>
        <CeoChatPanel canManageActions={canManageActions} />
      </section>

      {canManageActions && (
        <section id="ceo-change-center" className="rounded-3xl border border-gray-200 bg-white p-2 shadow-sm">
          <ChangeCenterPanel />
        </section>
      )}
    </div>
  );
}
