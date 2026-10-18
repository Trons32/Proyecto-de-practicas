# SPEC-002 · Capa de datos preparada para SQL

**Estado:** implementada (preparación) · **Prioridad:** P1 · **Motor:** SQL Server

## Problema

Todo el estado vive en localStorage (stores de Zustand). Los catálogos son
constantes en código; en SQL deben ser tablas. Sin un camino para sacar los
datos del navegador, lo que los usuarios registran hoy se perdería al pasar
a la base.

## Alcance

Esta etapa **prepara** la integración; no trae backend ni conecta la base
(requiere autorización expresa, ver `AGENTS.md`).

1. **Punto único de almacenamiento** (`src/lib/datos/almacen.ts`).
2. **Esquema SQL Server** con semilla generada desde el catálogo (`db/`).
3. **Respaldo JSON**: exportar e importar todo el estado desde `/admin/datos`.
4. **Migración**: `db/respaldo-a-sql.ts` convierte un respaldo en un script
   para la base.

### Decisión: adaptador de almacenamiento, no repositorios

La versión anterior de esta spec proponía una interfaz de repositorio por
agregado. Al implementarla se vio que duplicaba las acciones de los stores
(`enviar`, `aprobar`, `aplicarParametros`…), que ya son las operaciones del
dominio, sin ganar nada mientras no exista la API.

Se optó por un adaptador: los tres stores persisten a través de
`almacenamiento()`, y cambiar a un almacenamiento remoto (asíncrono) es
cambiar ese archivo. Las vistas ya esperan a `hidratado`, que es lo que
exige una carga remota.

Cuando llegue la API real (iteración 5 del plan), guardar el estado entero
en cada cambio no escalará: habrá que llevar cada acción del store a su
endpoint. Eso es trabajo de esa iteración, no de esta.

## Esquema

Ver `db/README.md`. Lo esencial:

- La cascada de SPEC-001 es una **FK compuesta** hacia
  `contrato_dedicacion_categoria`.
- Los **borradores caben**: la base impone coherencia (la cascada, los
  rangos, los estados), no completitud. La completitud la exige
  `validarDocente` antes de enviar.
- Bitácora y novedades **solo admiten INSERT** (trigger y permisos).
- `docente` es la persona (por documento); `docente_asignado`, su
  vinculación en un periodo. Habilita el histórico por docente (R6).

## Criterios de aceptación

- **CA-002.1** Ninguna vista accede a localStorage directamente.
- **CA-002.2** Los datos guardados antes del cambio se conservan intactos.
- **CA-002.3** El esquema se crea en una base vacía, rechaza una combinación
  contrato-dedicación-categoría inválida y admite un borrador incompleto.
- **CA-002.4** Un respaldo exportado y vuelto a leer trae exactamente lo
  mismo, y un archivo dañado o ajeno no entra.
- **CA-002.5** Un respaldo migrado a SQL Server conserva asignaciones,
  docentes, cursos, actividades, bitácoras y novedades con sus enlaces.

## Evidencia

- CA-002.1: solo `almacen.ts` y `sesion-store.ts` tocan el storage.
- CA-002.2: mismas claves y el mismo serializador JSON que `persist` usaba
  por defecto.
- CA-002.3: `db/prueba-esquema.sql`, 17 comprobaciones, en SQL Server 2022.
- CA-002.4: `src/lib/verificar-respaldo.ts`, con los 45 docentes del formato.
- CA-002.5: migración de un respaldo con los 45 docentes, un borrador y una
  novedad con su reapertura; los conteos de la base coinciden con el JSON.

## Pendiente con el cliente

- ¿Una sola asignación por programa y periodo? (restricción comentada en el
  esquema).
- Quién administra el servidor y crea el usuario de la aplicación.
