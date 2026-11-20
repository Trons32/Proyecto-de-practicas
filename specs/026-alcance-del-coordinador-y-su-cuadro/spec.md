# SPEC-026 · Cada coordinador ve lo suyo, y su cuadro resumen

**Estado:** implementada · **Prioridad:** P0 · **Depende de:** SPEC-004, SPEC-008

## Problema

`GET /api/estado/asignaciones` devolvía todas las asignaciones a
cualquiera con sesión. Un coordinador veía en su historial las de los
demás programas. El coordinador tampoco tenía reportes.

## Decisión

- **Alcance del coordinador** (`lib/servidor/alcance.ts`): las asignaciones
  de su programa (`usuario.programa_id`) y las que él creó (evento
  `creada` a su nombre). El administrador ve todas.
- **Se filtra en el servidor**, no en la vista: lo que no le toca no llega
  al navegador. Escribir o borrar una asignación fuera de su alcance
  responde 403.
- **Cuadro resumen del coordinador** en `/reportes`: el mismo cuadro del
  consolidado (`cuadroResumen`, `components/CuadroResumenVista.tsx`), con
  sus programas, sin filtro de facultad, con todas las asignaciones por
  defecto (también el borrador) y descarga en Excel.
