// ─── Helpers de cliente para el flujo MFA ─────────────────────────────────────

/**
 * Confirma en el servidor que la sesión llegó a aal2 y obtiene la redirección.
 * El servidor emite el cookie karuma_session(owner) y marca la actividad.
 */
export async function completeMfaBridge(): Promise<string> {
  const res = await fetch("/api/security/session-bridge", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error("bridge_failed");
  const data = (await res.json()) as { redirect?: string };
  return data.redirect || "/owner";
}
