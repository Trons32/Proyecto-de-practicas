# SPEC-017 · Importar asignaciones de periodos anteriores

**Estado:** implementada · **Prioridad:** P1 · **Depende de:** SPEC-007, SPEC-009, SPEC-016

## Problema

El comparativo estadístico solo tiene, para los periodos anteriores al
sistema, los totales pegados en el consolidado (`lib/historicos.ts`): no hay
docentes detrás. Las asignaciones de esos periodos existen en Excel, en el
formato que se usaba cada año. El administrador necesita cargarlas para que
el comparativo se calcule con los mismos datos y el mismo motor que lo
vigente.

No hay ejemplos de los formatos viejos (son reservados), y un archivo puede
traer varios programas, uno por hoja.

## Decisiones

1. **Una hoja = una asignación** de un programa en un periodo. Las hojas
   ocultas (listas, auxiliares) no se leen.
2. **Se lee por significado, no por posición.** `lib/importar/campos.ts`
   reconoce cada columna por cómo suele titularse; el grupo de encabezado de
   arriba («DESCARGAS DIRECTAS», «CURSOS») deshace los empates. La fila de
   encabezado es la que más campos reconoce entre las 40 primeras; la tabla
   es su tramo de columnas contiguo (las listas del formato en DU:EE quedan
   fuera); acaba en una fila de totales, de firmas o en el título de otra
   sección.
3. **Un docente es un bloque de filas**: empieza donde cambia la primera
   celda de identidad (No., documento, nombre, dedicación), sea una celda
   combinada nueva o un valor distinto. Así se leen el formato de bloques
   combinados y el que solo llena la primera fila. Los bloques vacíos de la
   plantilla se descartan.
4. **Nada dudoso se adivina.** Roles, dedicaciones y contratos que no
   coinciden sin duda con el catálogo quedan *pendientes* con una
   sugerencia; la hoja no se importa hasta que el administrador decide.
   Tiempo completo o medio tiempo sin contrato legible pide el contrato. Un
   rol puede ignorarse: sus horas quedan sin rol y se avisa.
5. **El administrador puede corregir la lectura**: la fila de títulos y qué
   campo es cada columna.
6. **Se comprueba contra el propio Excel.** Cada docente se recalcula con el
   motor y se compara con lo que el archivo ya traía (gran total, horas de
   clase, descargas, apoyo, estudiantes). El total semanal del formato solo
   se usa sin gran total, porque perdía horas por la posición del rol.
7. **Una importada nace aprobada, versión 0, sin línea base**, con un único
   evento `importada` a nombre del administrador cuya nota dice archivo, hoja
   y huella. El origen se deduce de ese evento (`esImportada`): la forma de
   `Asignacion` no cambia y no hay migración de stores. La migración
   `20261111000000_evento_importada` solo amplía el CHECK de tipos de evento.
8. **El servidor lo hace cumplir** (`transiciones.ts`): solo el
   administrador importa; una importada no admite eventos ni cambios
   después; solo el administrador la borra, para reemplazarla. `/api/importar`
   además nunca pisa una asignación hecha en el sistema y solo reemplaza una
   importada si se pide.
9. **No entran en el ciclo**: el impacto de un cambio de parámetros, las
   reaperturas y la proyección las ignoran. Un Excel viejo no renombra a la
   persona del docente.
10. **Comparativo**: cada programa usa su importada (fuente «Importado»). El
    total del periodo —cuadro resumen y por modalidad— sigue siendo el del
    consolidado hasta que estén todos los programas que el consolidado
    registra con docentes ese periodo (`coberturaImportada`). La vista
    lista los periodos a medias y qué programas faltan. Un periodo que el
    consolidado no tiene usa lo importado directamente.
11. Solo .xlsx. Un .xls se guarda antes como .xlsx desde Excel.

## Criterios de aceptación

- Dado el formato oficial 2026-2 real, cuando se lee, entonces salen sus 19
  docentes, en sus filas, con los mismos totales que `__fixture.json`, sin
  pendientes y sin diferencias contra el Excel.
- Dada una asignación exportada en formato oficial, cuando se vuelve a leer,
  entonces cada docente tiene los mismos totales.
- Dado un formato distinto (otros títulos, sin combinadas, encabezado en otra
  fila, «ROL 1 / HORAS 1», periodo «II-2023», dos hojas), entonces se
  reconocen periodo, programa, docentes, cursos, dedicación, contrato y rol.
- Dado un rol que no está en el catálogo, entonces queda pendiente y la hoja
  no se importa hasta decidirlo.
- Dado un coordinador, cuando intenta importar, entonces el servidor lo
  rechaza. Dada una importada, cuando se intenta reabrir o editar, también.
- Dado un periodo con un programa importado de 20, entonces el total del
  periodo es el del consolidado y el programa se ve con sus cifras; con los
  20, el total es el importado.

Evidencia: `npx tsx src/lib/verificar-importacion.ts "<ASIGNACION_IS_2026_2PV3.xlsx>"`.

## Pendiente

- Probar `/api/importar` contra PostgreSQL tras `npx prisma migrate deploy`.
- La matrícula de los periodos importados sigue saliendo del consolidado
  (spec 009): el formato trae estudiantes por curso, no la matrícula total.
