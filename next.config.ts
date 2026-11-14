import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  // Basis data demo yang sudah terisi dibuat saat prebuild (scripts/build-seed.ts) dan disalin ke /tmp saat cold start di Vercel.
  outputFileTracingIncludes: { "/*": ["./seed/rekasurya-seed.db"] },
};

export default nextConfig;
