import { cookies } from "next/headers";
import { ChangeCenterPanel } from "@/components/ceo/ChangeCenterPanel";
import { CeoChatPanel } from "@/components/ceo/CeoChatPanel";
import { OperationsCenter } from "@/components/ceo/OperationsCenter";
import { canViewCeo, isCeoAdmin } from "@/lib/auth/guards";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function CeoPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  const user = await verifySessionToken(token);

  if (!canViewCeo(user)) {
    return null;
  }

  const canManageActions = isCeoAdmin(user);

  return (
    <div className="min-w-0 space-y-4 overflow-x-hidden px-2 py-3 sm:px-6 sm:py-5 lg:px-8">
      <header className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-1">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700">Karuma ERP</p>
          <h1 className="mt-1 text-2xl font-semibold text-gray-950">AI CEO</h1>
        </div>
        <div className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-600">
          {canManageActions ? "管理模式" : "问答模式"}
        </div>
      </header>

      <section id="ceo-chat" className="min-w-0">
        <CeoChatPanel canManageActions={canManageActions} />
      </section>

      {canManageActions && (
        <section id="ceo-operations" className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <OperationsCenter />
        </section>
      )}

      {canManageActions && (
        <section id="ceo-change-center" className="rounded-3xl border border-gray-200 bg-white p-2 shadow-sm">
          <ChangeCenterPanel />
        </section>
      )}
    </div>
  );
}
