// ─── Enmascarado de datos sensibles ──────────────────────────────────────────

/** Muestra solo los últimos 4 dígitos de una cuenta: "•••• 4821". */
export function maskAccount(last4: string | null | undefined): string {
  const clean = String(last4 ?? "").replace(/\D/g, "").slice(-4);
  if (!clean) return "••••";
  return `•••• ${clean}`;
}

/** Deja solo los últimos 4 dígitos de una cadena arbitraria (defensivo). */
export function keepLast4(value: string | null | undefined): string | null {
  const clean = String(value ?? "").replace(/\D/g, "");
  if (clean.length < 4) return null;
  return clean.slice(-4);
}
