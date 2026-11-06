/**
 * Datos iniciales (SPEC-011):  npx prisma db seed
 *
 * 1. Los catálogos del formato oficial, leídos de src/lib/catalogos.ts —la
 *    fuente de verdad—, no copiados a mano.
 * 2. Los usuarios de prisma/usuarios.json (excluido de git: lleva correos
 *    reales; ver usuarios.ejemplo.json).
 *
 * Se puede correr cuantas veces se quiera: solo agrega lo que falta. Las
 * reglas, los límites y los roles NO se sobrescriben, porque después de la
 * instalación los cambia el administrador en /admin/parametros y cada
 * cambio queda en una novedad; pisarlos aquí lo borraría sin rastro.
 * Los usuarios sí se actualizan (nombre, rol, programa) y quedan activos.
 */
import "dotenv/config";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  CONTRATOS,
  FACULTADES,
  MAX_ADMINISTRATIVAS,
  MAX_CURSOS,
  MAX_DESCARGAS,
  PROGRAMAS,
  REGLAS_DEDICACION,
  ROLES,
} from "../src/lib/catalogos";
import { bd, cerrar } from "../src/lib/servidor/bd";

const unicos = <T>(xs: T[]) => [...new Set(xs)];

interface UsuarioInicial {
  email: string;
  nombres: string;
  rol: "ADMIN" | "COORDINADOR";
  /** Nombre del programa tal como está en el catálogo; solo coordinadores. */
  programa?: string;
}

async function principal() {
  const c = bd();
  const dedicaciones = unicos(Object.values(CONTRATOS).flatMap((d) => Object.keys(d)));
  const categorias = unicos(Object.values(CONTRATOS).flatMap((d) => Object.values(d).flat()));
  const ternas = Object.entries(CONTRATOS).flatMap(([tipo_contrato, porDedicacion]) =>
    Object.entries(porDedicacion).flatMap(([dedicacion, cats]) =>
      cats.map((categoria) => ({ tipo_contrato, dedicacion, categoria }))
    )
  );

  await c.$transaction(async (tx) => {
    const o = { skipDuplicates: true };
    await tx.facultad.createMany({ data: FACULTADES.map((codigo) => ({ codigo })), ...o });
    await tx.programa.createMany({
      data: PROGRAMAS.map((p) => ({ nombre: p.nombre, facultad: p.facultad, codigo: p.codigo || null })),
      ...o,
    });
    await tx.tipo_contrato.createMany({ data: Object.keys(CONTRATOS).map((codigo) => ({ codigo })), ...o });
    await tx.dedicacion.createMany({ data: dedicaciones.map((codigo) => ({ codigo })), ...o });
    await tx.categoria.createMany({ data: categorias.map((codigo) => ({ codigo })), ...o });
    await tx.contrato_dedicacion_categoria.createMany({ data: ternas, ...o });
    await tx.regla_dedicacion.createMany({
      data: Object.entries(REGLAS_DEDICACION).map(([dedicacion, r]) => ({
        dedicacion, max_horas: r.maxHoras, preparacion: r.preparacion, atencion: r.atencion, comunidades: r.comunidades,
      })),
      ...o,
    });
    await tx.limite.createMany({
      data: [{ id: 1, max_cursos: MAX_CURSOS, max_descargas: MAX_DESCARGAS, max_administrativas: MAX_ADMINISTRATIVAS }],
      ...o,
    });
    await tx.rol.createMany({
      data: ROLES.map((r) => ({ id: r.id, nombre: r.nombre, tipo: r.tipo, reclasificado: Boolean(r.reclasificado) })),
      ...o,
    });
  });
  console.log(`✓ Catálogos: ${PROGRAMAS.length} programas, ${ternas.length} combinaciones, ${ROLES.length} roles.`);

  // Usuarios demo: los mismos correos de los usuarios de prueba de
  // lib/auth/sesion.ts, para que con AUTH_PROVEEDOR=prueba se pueda entrar
  // con ambos roles en una base recién creada. Sus claves viven allí, no aquí.
  const demo: UsuarioInicial[] = [
    { email: "admin@cecar.edu.co", nombres: "Administrador del Sistema", rol: "ADMIN" },
    {
      email: "coordinador@cecar.edu.co",
      nombres: "Coordinador Académico",
      rol: "COORDINADOR",
      programa: "INGENIERÍA DE SISTEMAS",
    },
  ];
  const archivo = join(__dirname, "usuarios.json");
  if (!existsSync(archivo)) console.log("· Sin prisma/usuarios.json: solo se cargan los usuarios demo.");
  const usuarios = [
    ...demo,
    ...(existsSync(archivo) ? (JSON.parse(readFileSync(archivo, "utf8")) as UsuarioInicial[]) : []),
  ];
  for (const u of usuarios) {
    const programa = u.programa
      ? await c.programa.findUnique({ where: { nombre: u.programa }, select: { id: true } })
      : null;
    if (u.programa && !programa) throw new Error(`El programa «${u.programa}» de ${u.email} no está en el catálogo.`);
    // El correo va en minúsculas: así lo busca el inicio de sesión.
    const email = u.email.trim().toLowerCase();
    const datos = { nombres: u.nombres, rol: u.rol, programa_id: programa?.id ?? null, activo: true };
    await c.usuario.upsert({ where: { email }, update: datos, create: { email, ...datos } });
  }
  console.log(`✓ Usuarios: ${usuarios.length}.`);
}

principal()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(cerrar);
