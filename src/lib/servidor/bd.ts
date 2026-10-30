/**
 * La conexión a SQL Server. Solo se importa desde el servidor (route
 * handlers y scripts): las credenciales no pueden llegar al bundle.
 *
 * Un solo pool por proceso. En desarrollo Next recarga los módulos en cada
 * cambio; sin guardarlo en `globalThis` cada recarga abriría un pool nuevo
 * y dejaría el anterior con sus conexiones vivas.
 */
import sql from "mssql";

export { sql };

const config = (): sql.config => ({
  server: process.env.MSSQL_SERVIDOR ?? "localhost",
  port: Number(process.env.MSSQL_PUERTO ?? 1433),
  database: process.env.MSSQL_BASE ?? "asignacion_academica",
  user: process.env.MSSQL_USUARIO ?? "sa",
  password: process.env.MSSQL_CLAVE,
  options: {
    // El contenedor y muchos servidores internos usan certificado autofirmado.
    encrypt: true,
    trustServerCertificate: process.env.MSSQL_CONFIAR_CERTIFICADO !== "0",
  },
  pool: { max: 10, idleTimeoutMillis: 30_000 },
});

const global_ = globalThis as unknown as { __poolAsignacion?: Promise<sql.ConnectionPool> };

export function pool(): Promise<sql.ConnectionPool> {
  global_.__poolAsignacion ??= new sql.ConnectionPool(config()).connect().catch((e) => {
    // Si falló, que el siguiente intento vuelva a probar en vez de heredar el error.
    global_.__poolAsignacion = undefined;
    throw e;
  });
  return global_.__poolAsignacion;
}

/** La cadena vacía de la aplicación es "sin dato": NULL. */
const nulo = (v: unknown) => (v === "" || v === undefined || (typeof v === "number" && Number.isNaN(v)) ? null : v);

export type Ejecutar = (texto: string, ...valores: unknown[]) => Promise<sql.IResult<Record<string, unknown>>>;

/**
 * Cada `?` del texto se vuelve un parámetro: nada del cliente se concatena
 * en el SQL. mssql infiere el tipo del valor y SQL Server convierte el
 * resto (texto ISO → DATETIMEOFFSET, texto → UNIQUEIDENTIFIER).
 */
export const ejecutor =
  (crear: () => sql.Request): Ejecutar =>
  (texto, ...valores) => {
    const r = crear();
    let i = 0;
    const conParametros = texto.replace(/\?/g, () => {
      r.input(`p${i}`, nulo(valores[i]));
      return `@p${i++}`;
    });
    return r.query(conParametros);
  };

/** Fuera de una transacción: cada consulta toma una conexión del pool. */
export const ejecutarSuelto: Ejecutar = async (texto, ...valores) => {
  const p = await pool();
  return ejecutor(() => p.request())(texto, ...valores);
};

/** La API solo existe si el servidor se configuró para SQL. */
export const sqlHabilitado = () => process.env.ALMACEN === "sql";
