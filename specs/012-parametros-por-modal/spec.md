# SPEC-012 · Parámetros: cada cambio se guarda por separado

**Estado:** implementada (falta la prueba manual contra PostgreSQL) · **Prioridad:** P1 · **Reemplaza:** el flujo de borrador
de SPEC-003 (las novedades se conservan)

## Problema

En `/admin/parametros` todo es un solo borrador gigante:

- Los 57 roles, las 6 dedicaciones y los límites se muestran como campos
  siempre editables. La página es larga y no queda claro qué se tocó.
- Para crear **un** rol hay que escribirlo, buscar al final el botón
  "Revisar y aplicar", leer el resumen, escribir un motivo y confirmar. Son
  dos pasos para una sola acción.
- Si el administrador tocó varias cosas y se arrepiente de una, tiene que
  descartarlo todo. Si sale de la página sin aplicar, pierde todo.
- En producción esto ya confundió a un usuario: creó un rol y creyó que se
  había guardado, pero solo estaba en el borrador.

## Solución

Cada cosa que se configura se edita **por separado, en un modal, y se guarda
al pulsar Guardar**. No hay borrador de página ni botón de "Revisar y
aplicar".

| Qué                        | Cómo se ve                                       | Cómo se cambia                                  |
| -------------------------- | ------------------------------------------------ | ----------------------------------------------- |
| Roles                      | Lista de lectura: nombre, insignia de tipo, acciones | **Nuevo rol** → modal · ✎ → modal · 🗑 → confirmación |
| Dedicación docente         | Tabla de lectura (máx., preparación, atención, comunidades, total) | ✎ en la fila → modal con los 4 campos |
| Límites del formato        | Tres valores de lectura                          | ✎ en la tarjeta → modal con los 3 campos        |
| Valores oficiales          | Botón en el encabezado                           | Confirmación → modal de guardado                |

### El modal de guardado

Todos los casos usan el mismo componente, `ModalParametro`:

1. **Campos** de lo que se edita (nombre y tipo, o las horas de una
   dedicación, o los límites), con validación en línea.
2. **Resumen del cambio** (antes → después), calculado con
   `diferenciasParametros`. Solo se muestra cuando algo cambió. En un rol
   nuevo dice "Nuevo rol: X (Investigación)".
3. **Impacto**: si el cambio hace que asignaciones aprobadas dejen de cumplir
   las reglas, aparece el aviso ámbar que hoy sale en "Aplicar cambios",
   calculado con `fotoDeImpacto`. Si no hay impacto, no aparece nada.
4. **Motivo**: opcional. Si se deja vacío, se guarda uno generado
   ("Creación del rol PEPE", "Cambio en TIEMPO COMPLETO", …). **Es
   obligatorio cuando hay impacto**, porque esa novedad se va a revisar para
   decidir reaperturas.
5. **Guardar**: queda deshabilitado mientras no haya cambios o haya errores.
   Al guardar, se cierra el modal y sale un toast: "Rol creado · novedad
   N.º 14". Si hubo impacto, el toast trae un enlace a esa novedad.

### Por qué sigue habiendo novedades

La trazabilidad de SPEC-003 no se negocia: cada guardado deja **una
novedad** con autor, fecha, cambios y foto del impacto. Lo que cambia es la
granularidad. Antes había una novedad por cada "Aplicar", que a veces
mezclaba diez cambios. Ahora hay una por cada acción, y es más fácil de leer
en `/admin/novedades`.

## Reglas

- **La única vía sigue siendo `aplicarParametros`** del store de novedades.
  El modal arma `siguiente = vigentes + este cambio` y se lo pasa. No se
  llama a `reemplazarParametros` desde la vista (AGENTS.md §7).
- El cambio se arma **sobre la configuración vigente en el momento de
  guardar**, no sobre una copia de cuando se abrió la página. Así, dos
  modales seguidos no se pisan.
- **Roles**
  - El nombre se guarda en mayúsculas, recortado y sin repetir (se compara
    sin distinguir mayúsculas).
  - El id nuevo es el mayor vigente + 1. No se reutiliza, porque un id
    reutilizado heredaría las horas de otro rol.
  - Desactivar pide confirmación y dice cuántas asignaciones usan el rol
    (sus horas siguen sumando).
- **Dedicación**: todos los campos son enteros ≥ 0, y la suma de apoyo no
  puede superar el máximo de horas. El "apoyo total" se recalcula en vivo
  dentro del modal.
- **Límites**: enteros ≥ 1.
- **Valores oficiales**: es un guardado más. El modal muestra todos los
  cambios que trae restaurar y el motivo es obligatorio.
- Solo el administrador ve la página; `GuardiaSesion` no cambia. En el
  servidor, `/api/estado` ya exige el rol de administrador para la
  configuración.
- Nada se reabre solo (SPEC-003). Las decisiones sobre las afectadas siguen
  en `/admin/novedades/[id]`.
- **Si el servidor rechaza el guardado** (sin conexión, 401 o 409), el
  modal no se cierra y muestra el error. Hoy `almacen.ts` solo lanza un
  toast después de que la vista ya dio el cambio por bueno. Para cumplir
  esta regla, `aplicarParametros` debe esperar la escritura (ver
  Implementación, paso 2).

## Criterios de aceptación

- **CA-012.1** Dado el administrador en Parámetros, cuando pulsa "Nuevo
  rol", escribe "PEPE", elige Investigación y pulsa Guardar, entonces el
  modal se cierra, PEPE aparece en la lista, existe en la tabla `rol` de la
  base y hay una novedad nueva con el cambio "no existía → PEPE
  (Investigación)".
- **CA-012.2** Dado un rol existente, cuando abre ✎, cambia el tipo y
  guarda, entonces solo cambia ese rol y la novedad registra un único
  cambio.
- **CA-012.3** Dado el modal de un rol, cuando el nombre está vacío o ya
  existe, entonces Guardar está deshabilitado y el campo muestra el error.
- **CA-012.4** Dada una aprobada con un docente de 39 h de TIEMPO COMPLETO,
  cuando se edita esa fila a 38 h, entonces el modal avisa que 1 aprobada
  dejará de cumplir, no deja guardar sin motivo y, al guardar, la novedad
  la lista como afectada. La asignación sigue aprobada.
- **CA-012.5** Dado el modal de una dedicación, cuando la preparación más
  la atención más las comunidades superan el máximo, entonces no se puede
  guardar.
- **CA-012.6** Dado un rol usado por 3 asignaciones, cuando pulsa
  Desactivar, entonces la confirmación lo dice. Si cancela, no cambia nada;
  si confirma, el rol queda inactivo y esas asignaciones conservan sus horas.
- **CA-012.7** Dado que se guardó un cambio, cuando se recarga la página u
  otro equipo la abre, entonces el cambio está ahí (vino de la base).
- **CA-012.8** Dado que el servidor no responde, cuando se pulsa Guardar,
  entonces el modal sigue abierto con el error y no se registra ninguna
  novedad.
- **CA-012.9** En la página no queda ningún campo editable fuera de un
  modal, ni el botón "Revisar y aplicar", ni el aviso de cambios sin
  aplicar al salir.
- **CA-012.10** Dada una sesión de coordinador, cuando abre
  `/admin/parametros`, entonces no ve contenido (sin cambios respecto a
  hoy).

## Implementación

1. **Un `ModalParametro` genérico** en `src/app/admin/parametros/` que
   recibe `aplicar(vigentes) => Parametros`, el título y los campos. El
   resumen, el impacto, el motivo y el guardado son comunes. Tres envolturas
   finas: `ModalRol`, `ModalDedicacion` y `ModalLimites`.
2. **`aplicarParametros` asíncrono**: devuelve
   `Promise<Novedad | null>` y se resuelve cuando `/api/estado` confirmó
   las dos escrituras (configuración y novedad). Para eso, `almacen.ts`
   expone una espera de la cola de escrituras que diga si la última falló.
   Hay que revisar `solicitarCorreccion`, que hoy depende del orden de esa
   cola.
3. **El motivo opcional** se resuelve en el store, con un
   `motivoPorDefecto(cambios)` puro en `lib/novedades.ts`. Así la novedad
   nunca queda sin motivo, y `verificar-novedades.ts` puede probarlo.
4. **Se elimina** de `page.tsx`: el estado `borrador`, `clonar`, `revisar`,
   el `beforeunload`, el botón "Descartar", "Revisar y aplicar" y
   `ModalAplicar`.
5. **La forma persistida no cambia** (`configuracion` v2 y `novedades` v1).
   No hace falta migración ni subir de versión.

## Definición de terminado

Además de lo general de `specs/README.md`:

- `npx tsx src/lib/verificar-novedades.ts` pasa, con casos nuevos para
  `motivoPorDefecto` y para un cambio de un solo rol.
- CA-012.1, 012.4, 012.7 y 012.8 probados a mano contra PostgreSQL, con
  evidencia (consulta a `rol` y a `novedad`).
- Actualizar SPEC-003 (CA-003.4: el motivo es obligatorio solo con impacto)
  y AGENTS.md §7.

## Decisiones tomadas

- **Motivo opcional** sin impacto; obligatorio con impacto y al restaurar
  los valores oficiales.
- **Desactivar en vez de eliminar.** `RolParametro = Rol & { inactivo?: true }`
  en `lib/novedades.ts` (no se toca `catalogos.ts`). En la base es
  `rol.vigente = false`; `leerConfiguracion` ahora devuelve también los no
  vigentes. El desplegable del coordinador los oculta, salvo el que el
  docente ya tiene. Restaurar los oficiales deja inactivos los roles
  creados aquí. El 🗑 pasa a ser "Desactivar / Reactivar".
- **Guardado en dos tiempos**: primero la configuración y, si la base la
  aceptó, la novedad. Si la novedad falla, se revierte la configuración.
  `marcaDeGuardado()` en `almacen.ts` espera la cola y devuelve el primer
  error.

## Preguntas abiertas

- Confirmar con el cliente el motivo opcional. Si auditoría lo quiere
  siempre, basta con pasar `motivoObligatorio` en todos los modales.
