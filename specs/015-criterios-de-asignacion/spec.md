# SPEC-015 · Criterios de asignación académica

**Estado:** implementada · **Prioridad:** P1 · **Depende de:** SPEC-008

## Problema

Los criterios del Consejo Académico (documento «Criterios de asignación
académica 2027-1») circulan como un .docx. El coordinador los consulta
mientras arma la asignación y el administrador al revisarla, pero ninguno
los tiene a mano dentro del sistema.

## Reglas

1. Vista `/criterios`, de solo lectura, para **los dos roles**. Va fuera de
   `/admin` porque `GuardiaSesion` cierra esa zona al coordinador.
2. El contenido vive en `lib/criterios.ts` como datos (secciones con
   párrafos, listas, notas y tablas), transcrito del documento. Las tablas
   2, 3, 4, 5, 7, 8 y 10 se conservan como tablas.
3. **Es consulta, no regla.** El motor de cálculo no lee este archivo; los
   topes que se hacen cumplir siguen en `catalogos.ts` y en los parámetros.
4. Cada semestre se reemplaza el archivo entero y `PERIODO_CRITERIOS`.
5. Búsqueda sin tildes ni mayúsculas; en tablas y listas deja solo las filas
   y puntos que coinciden.
6. Las erratas evidentes del original se señalan con una nota, no se
   corrigen en silencio (coordinador de práctica: «2-18» → 2–8).

## Criterios de aceptación

- Dado un coordinador con sesión, cuando abre «Criterios» en el menú,
  entonces ve el documento por secciones con su índice.
- Dado el administrador, cuando abre «Criterios», entonces ve la misma vista.
- Dado «tutor» en la búsqueda, entonces aparecen las secciones de tutores y
  las filas de las tablas que lo mencionan, y nada más.
- Dada una búsqueda sin coincidencias, entonces se dice que no hay nada.

## Pendiente de confirmar con la Vicerrectoría

Celdas que el .docx deja ambiguas: «Editor de revista» (solo «20», tomado
como horas administrativas), «Director de semillero» (solo «3», tomado como
descarga) y las horas administrativas vacías de los roles Minciencias.
