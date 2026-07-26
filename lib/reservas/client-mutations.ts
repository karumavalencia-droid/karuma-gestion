export type ReservaMutationResult = { ok: true } | { ok: false; error: string };

export async function postReservaMutation(
  url: string,
  body: Record<string, unknown>,
  fallbackError = "No se pudo sincronizar la reserva.",
): Promise<ReservaMutationResult> {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!response.ok || json.ok === false) {
      return { ok: false, error: json.error ?? fallbackError };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: fallbackError };
  }
}
