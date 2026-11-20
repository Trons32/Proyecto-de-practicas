# SPEC-027 · Docentes que salen y que llegan

**Estado:** implementada · **Prioridad:** P1 · **Depende de:** SPEC-007, SPEC-017

## Problema

El formato trae, debajo de los docentes, DOCENTES SALIENTES (nombre,
dedicación, motivo) y DOCENTES NUEVOS (nombre, dedicación, reemplaza a). El
consolidado las junta en la hoja VARIACIONES. El sistema no las tenía.

## Decisión

- **La lista se arma sola** (`lib/variaciones.ts`): se compara con la
  asignación del mismo programa en el periodo anterior (aprobada primero,
  importadas incluidas), por cédula o, sin ella, por nombre.
- **El coordinador solo escribe el porqué**: motivo de salida (con atajos:
  sin disponibilidad de cursos, renuncia…) y, para los nuevos, a quién
  reemplaza y una nota opcional. Se guarda al salir del campo.
- **Sin asignación anterior** no se puede comparar: se avisa y los
  salientes se agregan a mano.
- **El motivo de salida es obligatorio para enviar.**
- **Al enviar queda la foto** de la lista; después se congela como los
  docentes (`transiciones.ts` la incluye en el contenido).
- Va en `/asignacion/[id]`, entre Docentes e Historial, como en el formato.

## Pendiente

- La síntesis VARIACIONES en los reportes del administrador.
- Las dos tablas en el Excel del formato oficial.
