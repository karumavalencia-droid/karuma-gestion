import type { SessionUser } from "@/lib/auth/session";

/** Documento is deliberately owner-only until the business access model is formalized. */
export function isDocumentoOwner(user: SessionUser | null): boolean {
  return Boolean(user && !user.employeeId && user.role === "owner");
}
