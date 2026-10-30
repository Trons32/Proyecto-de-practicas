import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El driver de SQL Server usa módulos nativos de Node: se carga tal cual
  // en el servidor en vez de empaquetarse.
  serverExternalPackages: ["mssql"],
};

export default nextConfig;
