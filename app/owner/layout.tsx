// Layout de la zona privada del propietario. Gate de SERVIDOR: owner + aal2 +
// sesión no inactiva. Es el control real (no basta con ocultar el menú).
// El middleware ya filtra antes; esto es defensa en profundidad.

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getOwnerContext } from "@/lib/owner/session";
import { OWNER_ACTIVITY_COOKIE, checkActivity } from "@/lib/owner/idle";
import { OwnerShell } from "@/components/owner/OwnerShell";

export const dynamic = "force-dynamic";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getOwnerContext();
  if (ctx.gate === "unauthenticated") redirect("/security/login");
  if (ctx.gate === "not_owner") redirect("/login");
  if (ctx.gate === "needs_setup") redirect("/security/setup-mfa");
  if (ctx.gate === "needs_verify") redirect("/security/verify-mfa");

  const store = await cookies();
  const activity = await checkActivity(store.get(OWNER_ACTIVITY_COOKIE)?.value);
  if (!activity.valid || activity.expired) redirect("/security/verify-mfa");

  return <OwnerShell email={ctx.email}>{children}</OwnerShell>;
}
