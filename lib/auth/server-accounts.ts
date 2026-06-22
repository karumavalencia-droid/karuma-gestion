import bcrypt from "bcryptjs";
import type { SessionUser } from "./session";

const ADMIN_EMAIL = (
  process.env.KARUMA_ADMIN_EMAIL ?? "admin@karuma.es"
).trim().toLowerCase();
const ADMIN_PASSWORD_HASH =
  process.env.KARUMA_ADMIN_PASSWORD_HASH ??
  "$2b$12$OzAUQHSAaO3utbaRjztr3.ml.nQCue8f179MlvbwiDHkwqzc3SoTK";

export async function authenticateBuiltInAdmin(
  email: string,
  password: string,
): Promise<SessionUser | null> {
  if (email !== ADMIN_EMAIL) return null;

  const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!valid) return null;

  return {
    name: "Karuma Admin",
    email: ADMIN_EMAIL,
    role: "owner",
  };
}
