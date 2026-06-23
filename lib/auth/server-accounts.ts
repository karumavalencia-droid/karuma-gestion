import bcrypt from "bcryptjs";
import type { SessionUser } from "./session";

const ADMIN_USERNAME = (
  process.env.KARUMA_ADMIN_USERNAME ?? "karuma"
).trim().toLowerCase();
const ADMIN_PASSWORD_HASH =
  process.env.KARUMA_ADMIN_PASSWORD_HASH ??
  "$2b$12$9FsIkdLeg57Lccg94zxxAeFeLS3L2ACMtHIXA4Axc6R3jE7zzMnO.";

export async function authenticateBuiltInAdmin(
  username: string,
  password: string,
): Promise<SessionUser | null> {
  if (username !== ADMIN_USERNAME) return null;

  const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH);
  if (!valid) return null;

  return {
    name: "Karuma Admin",
    email: "karuma@local",
    role: "owner",
    employeeId: null,
  };
}
