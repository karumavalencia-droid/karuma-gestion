/**
 * POST /api/inbox/manual — inyectar un mensaje de prueba (solo owner)
 *
 * Es lo que permite ejercitar TODO el Inbox (ingesta, deduplicación, reglas,
 * IA, bandeja, respuesta) sin esperar al App Review de Meta ni a la aprobación
 * de Google. No corresponde a ninguna plataforma real.
 *
 * Ejemplo:
 *   curl -X POST /api/inbox/manual -H 'content-type: application/json' \
 *     -d '{"body":"Hola, ¿tenéis mesa para 6 el sábado? Uno es celíaco","customerName":"Ana"}'
 */

import { NextResponse, type NextRequest } from "next/server";
import { requireOwner } from "@/lib/auth/owner-guard";
import { manualAdapter } from "@/lib/inbox/adapters/manual";
import { ingest, registrarEvento } from "@/lib/inbox/ingest";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const guard = await requireOwner(request);
  if ("response" in guard) return guard.response;

  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Cuerpo JSON no válido" }, { status: 400 });
  }

  const items = manualAdapter.normalize(body);
  if (items.length === 0) {
    return NextResponse.json(
      { error: "Falta el campo 'body' con el texto del mensaje" },
      { status: 400 },
    );
  }

  // Mismo recorrido que un webhook real: se registra el evento crudo primero.
  await registrarEvento("manual", body, true);

  // `conIa` permite probar la clasificación por reglas sin gastar en OpenAI.
  const conIa = body.conIa !== false;
  const resultado = await ingest(items, { conIa });

  const status = resultado.errores.length > 0 && resultado.nuevos === 0 ? 500 : 200;
  return NextResponse.json(resultado, { status });
}
