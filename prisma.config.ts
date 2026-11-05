/**
 * Configuración de la CLI de Prisma (SPEC-011).
 *
 *   npx prisma migrate deploy   crea o pone al día la base
 *   npx prisma db seed          catálogos del formato y usuarios iniciales
 *
 * Las migraciones son SQL escrito a mano: llevan triggers, CHECK y permisos
 * que Prisma no expresa. Nunca `prisma db push` (los ignoraría).
 */
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: { url: env("DATABASE_URL") },
});
