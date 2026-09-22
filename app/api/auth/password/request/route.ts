import { NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/auth/employee-account";

export async function POST(request: Request) {
  let body: { email?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }
  const result = await requestPasswordReset(body.email ?? "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 502 });
  return NextResponse.json({
    ok: true,
    verificationId: result.verificationId,
    emailHint: result.emailHint,
    expiresIn: "expiresIn" in result ? result.expiresIn : 300,
  });
}
