# SPEC-009 · Gráficas, comparativo estadístico y proyección

**Estado:** implementada · **Prioridad:** P1 · **Depende de:** SPEC-005 (cuadro resumen)

## Problema

El libro *CONSOLIDADO ASIGNACIÓN ACADÉMICA 2025* tiene tres hojas que el
sistema no reproduce o reproduce a medias:

| Hoja                     | Qué tiene                                                                   | Antes                         |
| ------------------------ | --------------------------------------------------------------------------- | ----------------------------- |
| CUADRO RESUMEN           | 4 tablas y 5 gráficas                                                       | Tablas sí, gráficas no        |
| COMPARATIVO ESTADÍSTICO  | Cuadro 2022-1 a 2025-2, por programa con variación, por modalidad, 6 gráficas | 4 periodos, sin gráficas      |
| PROYECCIÓN               | Cursos, horas y estudiantes proyectados contra los ajustados, por programa  | Nada                          |

## Decisiones (con el usuario, 2026-10-24)

1. **Los periodos anteriores al sistema se cargan del Excel una vez**
   (`lib/historicos.ts`, generado por `db/generar-historicos.ts`). Solo
   totales: no hay docentes detrás. Un periodo que ya tenga asignaciones
   aprobadas en el sistema usa las del sistema; el histórico solo rellena
   los que faltan.
2. **Lo proyectado es lo que se aprobó la primera vez; lo real es lo
   vigente.** Al aprobar por primera vez, la asignación guarda una **línea
   base** con sus cursos (grupo, semestre, horas, estudiantes). Después
   puede reabrirse y corregirse; la línea base no cambia. La proyección
   compara la línea base con lo aprobado vigente.
3. Docentes salientes y nuevos (la tabla por programa) queda para SPEC-005-B.

## Gráficas

Las del Excel, con las mismas series. Barras de una serie en el verde
CECAR; las de varias series con la paleta `#00733b, #2a78d6, #eb6834`
(validada; verde↔naranja está en la banda 6–8 de daltonismo, así que toda
gráfica de varias series lleva leyenda, separación de 2 px y tabla).

| Gráfica del Excel                                   | Dónde                  |
| --------------------------------------------------- | ---------------------- |
| Total docentes (por dedicación)                     | Cuadro resumen         |
| Nivel de formación                                  | Cuadro resumen         |
| Tipo de contrato                                    | Cuadro resumen         |
| Categorías de los docentes                          | Cuadro resumen         |
| Dedicación de los docentes (torta de 3 funciones)   | Cuadro resumen, como barra 100 % (una torta de 3 se lee peor) |
| Total docentes por periodo                          | Comparativo            |
| Horas de docencia directa por periodo               | Comparativo            |
| Descargas de investigación por periodo              | Comparativo            |
| Docentes por modalidad y periodo                    | Comparativo            |
| Docentes vs. estudiantes                            | Comparativo, **como dos gráficas**: dos escalas en un eje mienten |

## Proyección

Por programa, de las asignaciones aprobadas del periodo que tienen línea base:

| Columna                       | Cálculo                                                 |
| ----------------------------- | ------------------------------------------------------- |
| Cursos (proyectado / ajustado) | cursos en la línea base / en lo vigente                 |
| Horas                         | Σ intensidad horaria                                     |
| Estudiantes                   | Σ estudiantes de los cursos (cupos, no personas)         |
| Grupos de primer semestre     | grupos distintos con semestre 1                          |
| Cursos cerrados               | cursos de la línea base que ya no están (por id)         |
| Cursos nuevos                 | cursos vigentes que no estaban en la línea base          |
| Horas reducidas               | horas proyectadas − horas ajustadas                      |

Una asignación aprobada antes de esta spec no tiene línea base: no se
inventa (sería decir que nada cambió). Se lista aparte como "sin línea base".

## Reglas

- La línea base la fija `aprobar` la primera vez y nunca más. El servidor
  lo hace cumplir (`transiciones.ts`): solo puede aparecer junto con un
  evento `aprobada`, tiene que coincidir con los cursos de ese momento y
  no cambia después.
- Cambia la forma de `Asignacion`: `asignaciones` pasa a v4 (el `migrate`
  no inventa líneas base), el esquema SQL gana `aa.linea_base_curso` y
  `db/respaldo-a-sql.ts` la migra.
- Los históricos se importan tal como están en el Excel, incluidas
  cifras dudosas (ver "Pendiente"). No se corrigen a mano.

## Criterios de aceptación

- **CA-009.1** Con los históricos, el comparativo muestra 2022-1 a 2025-2
  con las mismas cifras del Excel.
- **CA-009.2** Un periodo con asignaciones aprobadas usa las del sistema,
  no el histórico.
- **CA-009.3** Aprobar por primera vez fija la línea base; reabrir, corregir
  y volver a aprobar no la cambia.
- **CA-009.4** Quitar un curso después de aprobado aparece como curso
  cerrado con sus horas reducidas.
- **CA-009.5** El servidor rechaza una línea base alterada o puesta sin
  aprobar.
- **CA-009.6** El comparativo y la proyección se descargan en .xlsx con las
  mismas cifras de pantalla: el histórico tal cual (sin fórmulas que lo
  "corrijan") y «—» donde no hay dato, nunca 0. La proyección lleva una
  hoja con cada curso cerrado y nuevo.

## Evidencia

- CA-009.1 y .2: `src/lib/verificar-reportes.ts`.
- CA-009.3 y .4: `src/lib/verificar-reportes.ts` con las acciones del store.
- CA-009.5: `src/lib/verificar-transiciones.ts`.
- CA-009.6: `src/lib/verificar-reportes.ts` relee los libros de
  `src/lib/exportar-comparativo.ts`.

## Pendiente con el cliente

- **Estudiantes de la institución.** El Excel trae el total por periodo
  (9.668 en 2022-1… 6.027 en 2025-2), que no sale de las asignaciones: la
  suma de estudiantes de los cursos cuenta a cada estudiante varias veces.
  Para los periodos nuevos, ¿quién lo registra?
- **Cifras dudosas del histórico**, importadas tal cual: 2024-1 "total
  horas de extensión" = 25.275 (los demás periodos rondan 500–900);
  2024-1 posdoctor de catedráticos = 13; 2023-2 tutor a distancia del
  cuadro resumen tiene `#REF!` en tipo de contrato.
- El Excel separa término fijo "a un año" e "inferior a un año"; el formato
  de asignación solo registra "término fijo". En el histórico se suman.
