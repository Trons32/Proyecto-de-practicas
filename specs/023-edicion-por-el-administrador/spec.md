# SPEC-023 · El administrador corrige lo entregado antes de aprobarlo

**Estado:** implementada · **Prioridad:** P0 · **Depende de:** SPEC-007, SPEC-022

## Problema

El administrador solo podía aprobar o devolver. Si encontraba un error
menor en lo que entregó el coordinador (un grupo mal escrito, unas horas
corridas) tenía que devolverlo, fijar un plazo y esperar el reenvío. La
jefatura pidió que el administrador pueda corregirlo él mismo.

## Decisión

- **Solo en `enviada` y `en_revision`**: lo que el administrador está
  revisando. Lo aprobado sigue cerrado; si hay que cambiarlo, se reabre
  por el camino de siempre. Así la línea base (SPEC-009) se fija con lo que
  el administrador terminó aprobando, y nunca se mueve después.
- **Con motivo obligatorio y rastro**: antes de editar, el administrador
  escribe por qué. Eso agrega a la bitácora el evento `editada_por_admin`
  (quién, cuándo, motivo). El estado y la versión no cambian: la entrega
  del coordinador sigue siendo la misma; lo que cambia es su contenido, y
  la bitácora dice quién lo cambió.
- **La edición queda abierta mientras el último evento sea
  `editada_por_admin`** (`edicionAdminAbierta`, `lib/plazos.ts`). Aprobar o
  devolver la cierra. No hay reloj: la convocatoria y el plazo de
  corrección son del coordinador, no del administrador.
- **El coordinador sigue sin poder editar** lo entregado, aunque la edición
  del administrador esté abierta.

## Dónde

- `lib/tipos.ts` — el tipo de evento.
- `lib/plazos.ts` — `EDITABLES_POR_ADMIN`, `edicionAdminAbierta`.
- `lib/stores/asignacion-store.ts` — `abrirEdicionAdmin`; las acciones de
  docentes la respetan cuando la sesión es de administrador.
- `lib/transiciones.ts` — el paso en `PASOS` (exige nota, no cambia el
  estado) y el permiso de contenido solo con la edición abierta.
- `prisma/migrations/20261119000000_evento_editada_por_admin` — el CHECK
  de tipos y la nota obligatoria.
- `app/asignacion/[id]` y la ficha del docente — el botón «Editar
  asignación» con el modal del motivo.

## Verificación

`npx tsx src/lib/verificar-transiciones.ts` cubre: el administrador no
edita sin abrir la edición; la abre con motivo y edita; no la abre sin
motivo ni sobre lo aprobado; el coordinador no edita con ella abierta;
aprobar la cierra.
