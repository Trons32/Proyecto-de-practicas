# SPEC-024 · Las horas tienen que cuadrar, salvo excepción del administrador

**Estado:** implementada · **Prioridad:** P0 · **Depende de:** SPEC-020, SPEC-023

## Problema

Pasarse del tope de la dedicación era un error, pero quedarse corto solo
era un aviso: un tiempo completo con 32 h de 40 se entregaba sin problema.
Y cuando un docente de verdad no cuadra (una comisión, una situación
autorizada), no había forma de dejarlo así con constancia.

## Decisión

- **El total semanal tiene que ser exactamente el tope** (`descuadreHoras`,
  `lib/calculo.ts`). Sobrar y faltar son errores: la asignación no se envía.
- **En la ficha**, pasarse bloquea el guardado desde cualquier pestaña
  (como en SPEC-020); quedarse corto bloquea al guardar Apoyo, el último
  paso: antes de eso el total todavía se está armando.
- **Solo el administrador**, con la edición abierta (SPEC-023), puede
  guardar un docente que no cuadra. Al guardar ve una alerta con cuánto
  sobra o falta y tiene que escribir un motivo.
- **La excepción vive en el docente** (`excepcionHoras`: motivo, autor,
  fecha, horas) y vale **solo para el total autorizado**
  (`excepcionVigente`). Con ella, el descuadre pasa a aviso y se sigue
  viendo con el motivo. Si las horas cambian, vuelve a ser error.
- **El servidor** (`lib/transiciones.ts`) rechaza que alguien que no sea el
  administrador con la edición abierta ponga o cambie una excepción, o que
  la ponga a nombre de otro. Quitarla sí puede cualquiera.

## Dónde

- `lib/tipos.ts` — `ExcepcionHoras`, opcional en `Docente`: lo guardado
  antes sigue siendo válido.
- `lib/calculo.ts` — `descuadreHoras`, `excepcionVigente` y la regla.
- `components/FormularioDocente.tsx` — el bloqueo y `onExcepcion`.
- La ficha del docente — el modal de la excepción.
- `prisma/migrations/20261119010000_excepcion_horas` — cuatro columnas en
  `docente_asignado`, todas o ninguna.
- `lib/servidor/leer.ts`, `escribir.ts`, `db/respaldo-a-sql.ts`.

## Verificación

`npx tsx src/lib/verificar-transiciones.ts`: sobrar y faltar son error,
cuadrar no deja hallazgo, la excepción vigente es aviso y deja de valer si
cambian las horas; solo el administrador con la edición abierta la pone.
