import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

type SbLike = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

export type EventoReserva = {
  reservaId: string;
  accion: "creada" | "cambiada" | "cancelada" | "estado" | "mesa";
  detalle?: string | null;
  actor: string;
};

// Nunca rompe la operación principal: si la tabla aún no existe, solo avisa en el log.
export async function registrarEvento(sb: SbLike, e: EventoReserva): Promise<void> {
  try {
    const { error } = await sb.from("reservas_historial").insert({
      reserva_id: e.reservaId,
      accion: e.accion,
      detalle: e.detalle ?? null,
      actor: e.actor,
    });
    if (error) console.warn("reservas_historial", error.message);
  } catch (err) {
    console.warn("reservas_historial", err);
  }
}

export async function actorPersonal(req: NextRequest): Promise<string> {
  const user = await verifySessionToken(req.cookies.get(SESSION_COOKIE_NAME)?.value).catch(() => null);
  return user?.name ? `personal: ${user.name}` : "personal";
}

const ESTADOS: Record<string, string> = {
  Confirmada: "Reservada", Sentado: "En mesa", Finalizada: "Se fue", Cancelada: "Cancelada", NoShow: "No show", WalkIn: "Walk-in",
};
export function estadoLegible(e: string | null | undefined): string {
  return (e && ESTADOS[e]) || String(e ?? "");
}
