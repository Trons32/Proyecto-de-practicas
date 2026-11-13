# SPEC-020 · Descargas, actividades y apoyo: sin exceso y más ágiles

**Estado:** implementada · **Prioridad:** P0 (el bloqueo) / P1 (la UX) · **Depende de:** SPEC-019

## Problema

1. **Se guardaba con el total por encima del tope.** En el piloto, un
   docente de hora cátedra (máximo 12 h) quedó guardado con 15 h desde la
   pestaña Descargas ("Cambios guardados"). El motor ya marcaba el exceso
   como error (`validarDocente`, campo `totalSemanal`), pero el formulario
   solo lo miraba al guardar la pestaña **Apoyo**: Docente, Cursos,
   Descargas y Actividades guardaban igual. Solo salía un aviso flotante
   ("Se superó el máximo de horas") que no impedía nada.
2. **Elegir un rol era lento.** Un `<select>` nativo con 56 roles (33 de
   docencia, 13 de investigación, 10 de extensión) en el orden del formato,
   sin agrupar y con nombres de hasta 96 caracteres.
3. **Cada descarga era una tarjeta alta**: rol en una fila, horas en otra.
   Al agregar, la fila nueva quedaba vacía y había que ir a buscarla.
4. **Las horas de apoyo** eran tres campos numéricos sueltos, sin el total
   ni una forma rápida de ajustar de a una hora.

## Solución

- **Bloqueo del exceso en todas las pestañas.** Guardar persiste el docente
  entero, así que con `totalSemanal > maxHoras` ninguna pestaña guarda. El
  error dice cuánto sobra y dónde reducir: *"No se guardó: se superó el
  máximo de horas · 15 h asignadas sobre un máximo de 12 h para hora
  cátedra. Reduzca 3 h en cursos, descargas, actividades o apoyo."* El tope
  no cambia: sale de la dedicación, como siempre.
- **El estado del tope al pie de cada pestaña**, junto al botón Guardar:
  `15 h de 12 h · excede por 3 h. Ajuste antes de guardar.` (rojo),
  `12 h de 12 h · completo` (verde) o `10 h de 12 h · faltan 2 h`.
- **`SelectorBuscable`** (`components/ui.tsx`) para el rol: se escribe para
  filtrar (cada palabra, en cualquier orden, sin tildes: "coord inv"),
  agrupado por Docencia / Investigación / Extensión y en orden alfabético,
  con el nombre completo visible. Teclado: ↑ ↓, Enter, Esc. La lista se
  pinta en `<body>` con posición fija (las tarjetas tienen `overflow-hidden`
  y la recortaban), mide al menos 440 px y se abre hacia arriba si abajo no
  cabe. Los roles
  inactivos siguen sin ofrecerse, salvo el que el docente ya tiene (SPEC-012).
- **Descargas y actividades en una fila**: `R1 · Docencia` · rol · horas
  (− / +) · quitar. Con la lista vacía, el botón de agregar va en el centro.
  Al agregar, la fila nueva abre su buscador de rol. El encabezado suma las
  horas: `1 de 3 · 3 h`.
- **`Contador`** (`components/ui.tsx`) para horas: − y +, y también se
  puede escribir. En Apoyo, cada componente muestra el valor institucional
  (en ámbar si se ajustó) y debajo va el total del apoyo.

Sin cambios en el modelo, el cálculo, los topes ni lo persistido.

## Criterios de aceptación

- **CA-020.1** Con 15 h para un máximo de 12, Guardar en cualquier pestaña
  no guarda y muestra el error con las 3 h que sobran.
- **CA-020.2** Con el total igual o por debajo del tope, se guarda como
  antes (estar por debajo es un aviso, no un error).
- **CA-020.3** El pie de cada pestaña muestra el total contra el tope y
  cambia al momento con cada edición.
- **CA-020.4** Escribir "coord inv" en el selector de rol deja solo los
  roles que contienen ambas palabras; Enter elige el resaltado.
- **CA-020.5** Agregar una descarga o una actividad abre el buscador de rol
  de la fila nueva.
- **CA-020.6** En solo lectura no se puede abrir el selector, ni usar los
  contadores, ni agregar o quitar.

## Evidencia

- Manual, con los dos roles: un docente de hora cátedra llevado a 15 h
  desde Descargas (CA-020.1), luego bajado a 12 h (CA-020.2), y una
  asignación aprobada (CA-020.6).
- `verificar.ts` sigue pasando: el cálculo no cambió.
