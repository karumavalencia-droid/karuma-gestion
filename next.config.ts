import type { NextConfig } from "next";
import path from "path";

// Id del despliegue en Vercel; en local no existe y vale "dev".
const deploymentId = process.env.VERCEL_DEPLOYMENT_ID;

const nextConfig: NextConfig = {
  // Evita que Next.js use /Users/karuma como raíz por un package-lock.json ajeno
  outputFileTracingRoot: path.resolve(__dirname),
  // Antes se omitían lint y tipos en el build porque ~30 ficheros de la v4.0 de
  // proveedores bloqueaban todos los deploys. Esa deuda ya está saldada:
  // `npx tsc --noEmit` pasa y `npx next lint` no tiene errores, así que el
  // build vuelve a ser el gate de calidad (los warnings de lint no bloquean).
  // Desfase de despliegues (skew): una pestaña abierta durante un deploy seguía
  // pidiendo assets y payloads RSC del build anterior y acababa pintando un 404
  // (p. ej. /documentos el 26/07). Next marca assets y peticiones RSC con el id
  // del despliegue; el rechazo automático de peticiones desfasadas lo hace la
  // "Skew Protection" de Vercel, que es de plan Pro y aquí está desactivada, así
  // que el aviso lo da el cliente (components/pwa/NuevaVersion.tsx).
  deploymentId,
  env: {
    // Se inlinea en el bundle para poder compararlo con /api/version.
    NEXT_PUBLIC_BUILD_ID: deploymentId ?? "dev",
  },
};

export default nextConfig;
