/**
 * POST /api/inbox/threads/[id]/reply — responder al cliente
 *
 * El envío vive en `lib/inbox/enviar.ts`, compartido con la respuesta
 * automática. Aquí solo queda la sesión y la traducción a HTTP.
 *
 * Si la plataforma no permite responder por API (Tripadvisor), devuelve 409 con
 * el permalink para que la interfaz ofrezca "copiar y abrir".
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireInbox } from "@/lib/auth/inbox-guard";
import { enviarRespuesta } from "@/lib/inbox/enviar";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const guard = await requireInbox(request);
  if ("response" in guard) return guard.response;

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    texto?: string;
    sugerenciaId?: string;
  };

  const resultado = await enviarRespuesta({
    threadId: id,
    texto: body.texto ?? "",
    autor: guard.user.name,
    autorEmail: guard.user.email,
    sugerenciaId: body.sugerenciaId ?? null,
  });

  if (!resultado.ok) {
    return NextResponse.json(
      resultado.permalink !== undefined
        ? { error: resultado.error, permalink: resultado.permalink }
        : { error: resultado.error },
      { status: resultado.status },
    );
  }

  return NextResponse.json({ ok: true, enviadoEn: resultado.enviadoEn });
}
