# SPEC-025 · Criterios editables, por modalidad, con borrador, publicación y PDF

**Estado:** implementada · **Prioridad:** P1 · **Depende de:** SPEC-015

## Problema

Los criterios del Consejo Académico estaban transcritos en
`lib/criterios.ts`: cambiarlos exigía programar y desplegar. No se podían
consultar por modalidad ni descargar.

## Decisión

- **Por modalidad.** Cada sección lleva `modalidad`: general (aplica a
  todas), presencial, distancia tradicional o virtual. El administrador la
  puede cambiar. La consulta filtra por modalidad.
- **En la base, por periodo** (`criterios_version`). Un periodo tiene a lo
  sumo **un borrador** y varias versiones **publicadas**, numeradas desde 1.
- **Borrador → publicación.** El administrador edita el borrador (se crea
  copiando la última versión publicada) y lo guarda cuantas veces quiera;
  nadie más lo ve. Al publicarlo escribe un motivo y pasa a ser la versión
  vigente. Puede descartarlo.
- **Lo publicado no se edita ni se borra**: un trigger lo impide. Corregir
  es publicar una versión nueva.
- **Historial**: cada versión publicada muestra quién, cuándo, el motivo y
  qué secciones cambiaron (`seccionesCambiadas`).
- **PDF**: se imprime la vista (Guardar como PDF), del documento completo
  o solo de una modalidad (más las secciones generales). Lleva el periodo
  y la versión.
- Mientras no hay nada publicado, se muestra la transcripción de
  `lib/criterios.ts` como versión 0.
- **Siguen siendo texto de consulta**: el motor de cálculo no los lee.

## Dónde

- `lib/criterios.ts` — la versión inicial, con su modalidad por sección.
- `lib/criterios-versiones.ts` — tipos, validación, cambios ← PURO.
- `prisma/migrations/20261119020000_criterios_version`.
- `app/api/criterios` — leer (los dos roles), guardar borrador, publicar y
  descartar (solo administrador).
- `app/criterios` — consulta, modalidades, historial y PDF.
- `app/admin/criterios` — el editor.

## Verificación

`npx tsx src/lib/verificar-criterios.ts`.
