# SPEC-030 · Descargas, actividades y apoyo según la dedicación

**Estado:** implementada · **Prioridad:** P0 · **Depende de:** SPEC-020, SPEC-024

## Problema

Algunos coordinadores no pueden enviar su asignación. Hay tres causas:

1. **Una fila vacía bloquea el guardado.** Si el coordinador pulsa «Agregar
   descarga» o «Agregar actividad» y deja la fila sin rol y con 0 h,
   `guardarSeccion` la cuenta como incompleta y no deja guardar. Un docente
   que no tiene descargas queda atascado.
2. **La ficha exige lo que no aplica.** Los pasos Descargas, Actividades y
   Apoyo salen «pendientes» en cero para cualquier dedicación, aunque hora
   cátedra, hora labor y los tutores no llevan apoyo (su regla es 0 h) ni
   tienen por qué tener descargas.
3. **El tope de esas dedicaciones se trató como total exacto.** SPEC-024 hizo
   que quedarse corto fuera *error*. Para hora cátedra y tutores las 12 h son
   un **máximo**: un catedrático con 8 h de cursos es válido, pero hoy deja un
   «dato pendiente» y la asignación no se envía.

## Decisión

### Filas: el coordinador las agrega, y las vacías se descartan

- Un docente nuevo **no trae filas** de descargas ni de actividades
  (`nuevoDocente` ya nace con `[]`; se mantiene así). Las agrega quien las
  necesita, con «Agregar».
- **Al guardar se descartan las filas vacías** (sin rol y con 0 h), en
  cualquier pestaña, antes de validar y de persistir. No cuentan como
  pendientes, ni bloquean.
- Una **fila a medias** sigue siendo error: rol sin horas, u horas sin rol.

### Obligatoriedad por dedicación

| Dedicación | Descargas | Actividades | Apoyo académico | Horas |
|---|---|---|---|---|
| Tiempo completo | **obligatoria** (≥ 1) | opcional | **obligatorio** (> 0 h) | deben cuadrar (SPEC-024) |
| Medio tiempo | **obligatoria** (≥ 1) | opcional | **obligatorio** (> 0 h) | deben cuadrar (SPEC-024) |
| Hora cátedra, hora labor, tutor virtual, tutor EAD | opcional | opcional | opcional | **máximo**: pasarse bloquea, quedarse corto no |

- La regla vive en `validarDocente` (`lib/calculo.ts`), con una función pura
  `exigeDescargasYApoyo(dedicacion)` como única definición: TC y MT. Los
  hallazgos nuevos son *error* y van a `descarga-requerida` y `apoyo`.
- **Apoyo en TC/MT**: se exige `preparacion + atencion + comunidades > 0`. Los
  valores siguen precargándose desde la regla de la dedicación; el coordinador
  los puede ajustar, pero no dejarlos en cero.
- **Cuadre**: `descuadreHoras` sigue igual. En `validarDocente` y en
  `guardarSeccion`, el faltante de horas solo es error para TC y MT; en las
  demás no genera hallazgo. El exceso sigue bloqueando para todas (con la
  excepción del administrador, SPEC-024).
- **Pasos de la ficha** (`docente/[docenteId]/page.tsx`): Descargas y Apoyo
  solo cuentan como pendientes en TC/MT; en las demás se muestran como
  «opcional». Actividades es opcional para todas.

### Lo que no cambia

- Topes, roles y reglas de `catalogos.ts` y de `/admin/parametros`.
- La forma del estado persistido: no hay `version` nueva ni migración. Las
  filas vacías ya guardadas se limpian la próxima vez que se guarde el docente.
- Los totales: `calcularTotales` no se toca, así que `verificar.ts` debe dar lo
  mismo con los 45 docentes reales.

## Verificación

- `npx tsx src/lib/verificar-dedicacion.ts` (nueva): por cada dedicación,
  docente sin descargas, sin apoyo, con fila vacía, con fila a medias, corto
  de horas y pasado de horas; comprueba qué hallazgos salen y su severidad.
- `npx tsx src/lib/verificar.ts`, `verificar-reportes.ts`,
  `verificar-importacion.ts`, `npx tsc --noEmit` y `npm run lint`.
- A mano, con el coordinador: catedrático con solo cursos y menos de 12 h se
  guarda y la asignación se envía; un tiempo completo sin descargas o con
  apoyo en 0 no se guarda y dice por qué.
