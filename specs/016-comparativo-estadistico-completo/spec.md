# SPEC-016 · Comparativo estadístico completo

**Estado:** implementada · **Prioridad:** P1 · **Depende de:** SPEC-009

## Problema

La hoja *COMPARATIVO ESTADÍSTICO* del Excel tiene 16 elementos (10 tablas y
6 gráficas). SPEC-009 reprodujo una parte: el cuadro, una sola tabla por
programa con las tres modalidades mezcladas, la tabla por modalidad y cinco
gráficas. Faltaban las tablas separadas por modalidad, con su total y su
variación, la tabla por periodo, la de docentes contra estudiantes y la
gráfica TC/MT/CAT/tutor.

## Inventario y dónde queda

Página `/admin/reportes/comparativo`, en pestañas que siguen el orden de la hoja.

| # | Elemento del Excel | Pestaña |
|---|---|---|
| T1 | Cuadro resumen por periodo (B4) | Resumen |
| T2 | Presencial por facultad y programa (B41) | Presencial |
| T3 | Variación, presencial (AN44) | Presencial |
| T4 | A distancia por programa (B65) | A distancia |
| T5 | Variación, a distancia (AU67) | A distancia |
| T6 | Virtual por programa (B74) | Virtual |
| T7 | Variación, virtual (AU76) | Virtual |
| T8 | Docentes vs. estudiantes (BB48) | Docentes vs. estudiantes |
| T9 | Total docentes por modalidad (B89) | Por modalidad |
| T10 | Comparativo docente por periodo (B99) | Resumen |
| G1 | Total docentes por periodo | Resumen |
| G2 | Horas de docencia directa | Resumen |
| G3 | Descargas de investigación | Resumen |
| G4 | Total docentes TC, MT, CAT y tutor | Resumen (agrupada, 4 series) |
| G5 | Docentes vs. estudiantes | Docentes vs. estudiantes (dos gráficas: un eje por medida) |
| G6 | Por modalidad y periodo | Por modalidad |

## Decisiones

1. **Total general = suma de los programas mostrados** (`totalProgramas`).
   En periodos históricos puede no coincidir con T9, que copia la cifra del
   Excel; la nota de la tabla lo advierte. No se "corrige" ninguna de las dos.
2. **Tablas por programa: el total primero y el detalle a pedido.** Ocho
   periodos por cinco dedicaciones no caben en pantalla; el detalle se abre
   con un enlace en la tabla.
3. **Presencial no lleva columna de tutor**, como el Excel.
4. **Cuarto color de serie** `#8e5cc9` para tutor, validado en el orden de
   la paleta (modo claro, peor par adyacente ΔE 22,8).
5. **Estudiantes por docente** solo donde hay matrícula del consolidado; para
   periodos del sistema queda «—» hasta que exista la fuente (spec 009).
6. El .xlsx suma dos hojas: `POR PERIODO` y `DOCENTES VS ESTUDIANTES`.

## Verificación

`npx tsx src/lib/verificar-reportes.ts`: comprueba que las dedicaciones
suman el total, que un periodo vacío no vale cero, la relación de 2022-1
(9.668 / 526 = 18,4), que el total general suma los programas y las hojas
del libro.
