import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // Evita que Next.js use /Users/karuma como raíz por un package-lock.json ajeno
  outputFileTracingRoot: path.resolve(__dirname),
};

export default nextConfig;
