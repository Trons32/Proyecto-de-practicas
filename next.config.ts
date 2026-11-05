import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El driver de PostgreSQL usa módulos de Node (net, tls): se carga tal cual
  // en el servidor en vez de empaquetarse.
  serverExternalPackages: ["pg", "@prisma/adapter-pg"],
};

export default nextConfig;
