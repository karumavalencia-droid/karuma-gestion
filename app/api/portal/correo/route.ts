import { NextRequest, NextResponse } from "next/server";
import {
  getEmployeeAccountStatus,
  requestActivationCode,
} from "@/lib/auth/employee-account";
import { getSessionUser } from "@/lib/auth/guards";

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  }
  if (!user.employeeId) return NextResponse.json({ pendiente: false, email: null });
  try {
    const status = await getEmployeeAccountStatus(user);
    return NextResponse.json({
      pendiente: status.pending,
      email: status.email,
      emailHint: status.emailHint,
      requierePassword: status.pending,
    });
  } catch (error) {
    console.error("[employee-activation] status:", error);
    return NextResponse.json(
      { error: "No se pudo comprobar tu cuenta. Avisa al encargado." },
      { status: 503 },
    );
  }
}

export async function POST(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Debes iniciar sesión" }, { status: 401 });
  let body: { email?: string };
  try {
    body = (await request.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  const result = await requestActivationCode(user, body.email ?? "");
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json(result);
}
