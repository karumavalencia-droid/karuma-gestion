// GET /api/owner/session — estado de la sesión del propietario para la UI.
import { requireOwnerApi, ownerJson } from "@/lib/owner/guards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const guard = await requireOwnerApi();
  if (!guard.ok) return guard.response;
  return ownerJson({
    email: guard.ctx.email,
    aal: guard.ctx.aal,
    hasVerifiedFactor: guard.ctx.hasVerifiedFactor,
  });
}
