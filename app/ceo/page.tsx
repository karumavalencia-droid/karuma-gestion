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
      <section className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">AI CEO</p>
            <h1 className="mt-1 text-2xl font-semibold text-gray-900">Karuma Executive Desk</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">
              Todos los usuarios pueden preguntar cosas básicas aquí. Solo owner/admin puede mover o editar cambios del sistema.
            </p>
          </div>
          <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
            {canManageActions ? "Modo gestión activo" : "Modo preguntas"}
          </div>
        </div>
        <CeoChatPanel canManageActions={canManageActions} />
      </section>

      {canManageActions && (
        <section className="rounded-3xl border border-gray-200 bg-white p-2 shadow-sm">
          <ChangeCenterPanel />
        </section>
      )}
    </div>
  );
}
