/**
 * GET /api/version (público)
 *
 * Devuelve el id del despliegue que atiende la petición. El cliente lo compara
 * con el id con el que se construyó su bundle: si no coinciden, la pestaña
 * lleva código de un despliegue anterior y hay que recargar (ver
 * components/pwa/NuevaVersion.tsx).
 *
 * Es el sustituto casero de la Skew Protection de Vercel, que es de plan Pro.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    { buildId: process.env.NEXT_PUBLIC_BUILD_ID ?? "dev" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
