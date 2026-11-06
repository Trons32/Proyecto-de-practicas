/**
 * La conexión a PostgreSQL por Prisma (SPEC-011). Solo se importa desde el
 * servidor (route handlers y scripts): las credenciales no pueden llegar al
 * bundle.
 *
 * Un solo cliente por proceso. En desarrollo Next recarga los módulos en
 * cada cambio; sin guardarlo en `globalThis` cada recarga abriría un pool
 * nuevo y dejaría el anterior con sus conexiones vivas.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, type Prisma } from "@/generated/prisma/client";

/** El cliente o una transacción: las lecturas sirven dentro y fuera de una. */
export type Cliente = Prisma.TransactionClient;

function crear() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Defina DATABASE_URL en el servidor.");
  // El TLS va en la URL: ?sslmode=no-verify con certificado autofirmado,
  // ?sslmode=verify-full para exigir uno válido.
  const adaptador = new PrismaPg({
    connectionString: url,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
  return new PrismaClient({ adapter: adaptador });
}

const global_ = globalThis as unknown as { __prismaAsignacion?: ReturnType<typeof crear> };

export function bd() {
  global_.__prismaAsignacion ??= crear();
  return global_.__prismaAsignacion;
}

/** Cierra la conexión; lo usan los scripts para que el proceso termine. */
export async function cerrar() {
  await global_.__prismaAsignacion?.$disconnect();
  global_.__prismaAsignacion = undefined;
}
