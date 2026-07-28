import type { Role } from "./permissions";
import { isValidRole } from "./permissions";
import { signPayload, verifySignedPayload } from "./signing";

export const SESSION_COOKIE_NAME = "karuma_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

/**
 * Edad a partir de la cual el middleware renueva la cookie de sesión.
 *
 * Sin esto la sesión caduca 7 días exactos después del login aunque se use a
 * diario. Con renovación deslizante, un usuario activo no vuelve a ver la
 * pantalla de login; uno que no entra en 7 días, sí.
 */
export const SESSION_REFRESH_AFTER_SECONDS = 60 * 60 * 24;

export type SessionUser = {
  name: string;
  email: string;
  role: Role;
  employeeId: string | null;
};

export type VerifiedSession = {
  user: SessionUser;
  /** Epoch en milisegundos en que caduca el token. */
  expiresAt: number;
};

type SessionPayload = SessionUser & {
  version: 1;
  expiresAt: number;
};

/** Opciones de la cookie de sesión, iguales en todos los puntos que la emiten. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const payload: SessionPayload = {
    version: 1,
    name: user.name,
    email: user.email,
    role: user.role,
    employeeId: user.employeeId,
    expiresAt: Date.now() + SESSION_MAX_AGE_SECONDS * 1000,
  };

  return signPayload(payload);
}

/** Verifica el token y devuelve usuario + caducidad (necesaria para renovar). */
export async function verifySession(
  token: string | null | undefined,
): Promise<VerifiedSession | null> {
  const payload = await verifySignedPayload<Partial<SessionPayload>>(token);
  if (!payload) return null;

  if (
    payload.version !== 1 ||
    typeof payload.name !== "string" ||
    typeof payload.email !== "string" ||
    !isValidRole(payload.role) ||
    !(
      payload.employeeId === null ||
      typeof payload.employeeId === "string" ||
      typeof payload.employeeId === "undefined"
    ) ||
    typeof payload.expiresAt !== "number" ||
    payload.expiresAt <= Date.now()
  ) {
    return null;
  }

  return {
    user: {
      name: payload.name,
      email: payload.email,
      role: payload.role,
      employeeId:
        typeof payload.employeeId === "string" ? payload.employeeId : null,
    },
    expiresAt: payload.expiresAt,
  };
}

export async function verifySessionToken(
  token: string | null | undefined,
): Promise<SessionUser | null> {
  return (await verifySession(token))?.user ?? null;
}

/** True cuando al token le queda menos vida de la ventana de renovación. */
export function shouldRefreshSession(expiresAt: number): boolean {
  const remainingSeconds = (expiresAt - Date.now()) / 1000;
  return remainingSeconds < SESSION_MAX_AGE_SECONDS - SESSION_REFRESH_AFTER_SECONDS;
}
